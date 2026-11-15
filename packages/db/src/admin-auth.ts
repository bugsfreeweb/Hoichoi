import { createHash, randomBytes } from "node:crypto";
import { getClient } from "./client";
import { ensureAdminLoginCodesTable, ensureLoginLogTable } from "./client";
import type { AdminLoginLog, LoginLogPage } from "@hoichoi/shared-types";

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

/** Revoke every outstanding (unused) login code for an email — desktop
 *  "lock the web admin out" action. Returns the number revoked. */
export async function revokeAdminLoginCodesByEmail(email: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: "UPDATE admin_login_codes SET revoked_at = ? WHERE email = ? AND used_at IS NULL AND revoked_at IS NULL",
    args: [new Date().toISOString(), email.trim().toLowerCase()],
  });
  return res.rowsAffected;
}

/** Hard-delete all web admin sessions for an email — forces the browser(s)
 *  out immediately; a fresh desktop-minted code is required to sign back in. */
export async function revokeAdminSessionsByEmail(email: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: `DELETE FROM admin_sessions WHERE user_id IN (
            SELECT id FROM admin_users WHERE email = ?
          )`,
    args: [email.trim().toLowerCase()],
  });
  return res.rowsAffected;
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

/* ---------- admin login log (who/when/how the admin console signs in) ---------- */

/** Record one sign-in attempt (web code login); failures are logged too. */
export async function logAdminLogin(opts: {
  email: string;
  ok: boolean;
  ip?: string | null;
  userAgent?: string | null;
  message?: string | null;
}): Promise<void> {
  const client = getClient();
  await ensureLoginLogTable(client);
  await client.execute({
    sql: "INSERT INTO admin_login_log (id, email, ok, ip, user_agent, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      randomBytes(16).toString("hex"),
      opts.email.trim().toLowerCase(),
      opts.ok ? 1 : 0,
      opts.ip ?? null,
      opts.userAgent ?? null,
      opts.message ?? null,
      new Date().toISOString(),
    ],
  });
}

function mapLoginLogRow(row: Record<string, unknown>): AdminLoginLog {
  return {
    id: String(row.id),
    email: String(row.email),
    ok: Boolean(row.ok),
    ip: (row.ip as string) ?? null,
    user_agent: (row.user_agent as string) ?? null,
    message: (row.message as string) ?? null,
    created_at: String(row.created_at),
  };
}

/** Paginated login log, newest first. `perPage` clamped to 1..100. */
export async function listLoginLog(page = 1, perPage = 10): Promise<LoginLogPage> {
  const client = getClient();
  await ensureLoginLogTable(client);
  const pageNum = Math.max(1, Math.floor(page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(perPage)));
  const totalRes = await client.execute("SELECT COUNT(*) AS n FROM admin_login_log");
  const total = Number((totalRes.rows[0] as Record<string, unknown>).n ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const res = await client.execute({
    sql: "SELECT * FROM admin_login_log ORDER BY created_at DESC LIMIT ? OFFSET ?",
    args: [pageSize, (pageNum - 1) * pageSize],
  });
  return {
    rows: res.rows.map((r) => mapLoginLogRow(r as Record<string, unknown>)),
    total,
    page: pageNum,
    pages,
  };
}

/** Delete one login-log entry. */
export async function deleteLoginLog(id: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "DELETE FROM admin_login_log WHERE id = ?",
    args: [id],
  });
}

/** Clear the whole login log; returns the number of removed rows. */
export async function clearLoginLog(): Promise<number> {
  const client = getClient();
  await ensureLoginLogTable(client);
  const res = await client.execute("DELETE FROM admin_login_log");
  return res.rowsAffected;
}
/* ---------- session/device management (credential lifecycle) ---------- */

export interface AdminSessionRow {
  /** Public id: first 16 hex chars of the token hash — never the token itself. */
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  device_name: string | null;
  device_os: string | null;
  app_version: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
}

/**
 * Sessions for the credential/security screen. `forEmail` limits to one admin
 * account; an admin looking at their own devices must not see other admins'.
 * Order: active first (most recent), then revoked.
 */
export async function listAdminSessions(opts: { email?: string; limit?: number } = {}): Promise<AdminSessionRow[]> {
  const client = getClient();
  const limit = Math.min(opts.limit ?? 100, 500);
  if (opts.email) {
    const res = await client.execute({
      sql: `SELECT s.token_hash, s.user_id, u.email, u.display_name, u.role,
                   s.device_name, s.device_os, s.app_version, s.ip_hash, s.user_agent_hash,
                   s.created_at, s.expires_at, s.last_used_at, s.revoked_at, s.revoked_by, s.revoked_reason
            FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
            WHERE u.email = ?
            ORDER BY (s.revoked_at IS NULL) DESC, s.last_used_at DESC
            LIMIT ?`,
      args: [opts.email.trim().toLowerCase(), limit],
    });
    return res.rows.map(mapSessionRow);
  }
  const res = await client.execute({
    sql: `SELECT s.token_hash, s.user_id, u.email, u.display_name, u.role,
                 s.device_name, s.device_os, s.app_version, s.ip_hash, s.user_agent_hash,
                 s.created_at, s.expires_at, s.last_used_at, s.revoked_at, s.revoked_by, s.revoked_reason
          FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
          ORDER BY (s.revoked_at IS NULL) DESC, s.last_used_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return res.rows.map(mapSessionRow);
}

export function mapSessionRow(r: Record<string, unknown>): AdminSessionRow {
  const tokenHash = String(r.token_hash);
  return {
    id: tokenHash.slice(0, 16),
    user_id: String(r.user_id),
    email: String(r.email),
    display_name: (r.display_name as string) ?? null,
    role: String(r.role),
    device_name: (r.device_name as string) ?? null,
    device_os: (r.device_os as string) ?? null,
    app_version: (r.app_version as string) ?? null,
    ip_hash: (r.ip_hash as string) ?? null,
    user_agent_hash: (r.user_agent_hash as string) ?? null,
    created_at: String(r.created_at),
    expires_at: String(r.expires_at),
    last_used_at: (r.last_used_at as string) ?? null,
    revoked_at: (r.revoked_at as string) ?? null,
    revoked_by: (r.revoked_by as string) ?? null,
    revoked_reason: (r.revoked_reason as string) ?? null,
  };
}

/**
 * Revoke one session by its public id (token-hash prefix).
 * Returns rows affected, so callers can tell a real revoke from a stale id.
 */
export async function revokeAdminSessionById(id: string, revokedBy: string, reason: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: "UPDATE admin_sessions SET revoked_at = ?, revoked_by = ?, revoked_reason = ? WHERE substr(token_hash, 1, 16) = ? AND revoked_at IS NULL",
    args: [new Date().toISOString(), revokedBy, reason, id],
  });
  return res.rowsAffected;
}

/**
 * Revoke every active session of one admin, optionally keeping the current one
 * (`exceptId` = its public id). Used by "sign out everywhere" and by
 * credential-revocation on account deletion.
 */
export async function revokeAllAdminSessions(
  userId: string,
  revokedBy: string,
  reason: string,
  exceptId?: string | null,
): Promise<number> {
  const client = getClient();
  const now = new Date().toISOString();
  if (exceptId) {
    const res = await client.execute({
      sql: "UPDATE admin_sessions SET revoked_at = ?, revoked_by = ?, revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL AND substr(token_hash, 1, 16) != ?",
      args: [now, revokedBy, reason, userId, exceptId],
    });
    return res.rowsAffected;
  }
  const res = await client.execute({
    sql: "UPDATE admin_sessions SET revoked_at = ?, revoked_by = ?, revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL",
    args: [now, revokedBy, reason, userId],
  });
  return res.rowsAffected;
}
