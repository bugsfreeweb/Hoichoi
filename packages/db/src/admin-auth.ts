import { createHash, randomBytes } from "node:crypto";
import { getClient } from "./client";
import { ensureAdminLoginCodesTable } from "./client";

/** One-time codes are 8 chars from an unambiguous alphabet (no 0/O/1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
/** Codes expire 10 minutes after issuance, matching a single login attempt. */
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function codeHash(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

export function randomLoginCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    out += CODE_ALPHABET.charAt(byte % CODE_ALPHABET.length);
  }
  return out;
}

export interface AdminLoginCodeRow {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

/** Mint a one-time login code. The plaintext is returned exactly once here. */
export async function createAdminLoginCode(opts: {
  email: string;
  label?: string | null;
  ttlMs?: number;
}): Promise<{ id: string; code: string; email: string; expires_at: string }> {
  const client = getClient();
  await ensureAdminLoginCodesTable(client);
  const email = opts.email.trim().toLowerCase();
  const code = randomLoginCode();
  const id = randomBytes(16).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + (opts.ttlMs ?? DEFAULT_TTL_MS));
  await client.execute({
    sql: "INSERT INTO admin_login_codes (id, email, label, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, email, opts.label ?? null, codeHash(code), now.toISOString(), expires.toISOString()],
  });
  return { id, code, email, expires_at: expires.toISOString() };
}

export async function listAdminLoginCodes(limit = 100): Promise<AdminLoginCodeRow[]> {
  const client = getClient();
  await ensureAdminLoginCodesTable(client);
  const res = await client.execute({
    sql: "SELECT * FROM admin_login_codes ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      email: String(row.email),
      label: (row.label as string) ?? null,
      created_at: String(row.created_at),
      expires_at: String(row.expires_at),
      used_at: (row.used_at as string) ?? null,
      revoked_at: (row.revoked_at as string) ?? null,
    };
  });
}

export async function revokeAdminLoginCode(id: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE admin_login_codes SET revoked_at = ? WHERE id = ?",
    args: [new Date().toISOString(), id],
  });
}

/**
 * Atomically consume a code: must match email, be unused, unrevoked and
 * unexpired. Only one request can win (guarded UPDATE), so a code is truly
 * one-time.
 */
export async function consumeAdminLoginCode(email: string, code: string): Promise<boolean> {
  const client = getClient();
  const e = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: "SELECT id FROM admin_login_codes WHERE email = ? AND code_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ? LIMIT 1",
    args: [e, codeHash(code), now],
  });
  if (res.rows.length === 0) return false;
  const id = String((res.rows[0] as Record<string, unknown>).id);
  const updated = await client.execute({
    sql: "UPDATE admin_login_codes SET used_at = ? WHERE id = ? AND used_at IS NULL",
    args: [now, id],
  });
  return updated.rowsAffected === 1;
}