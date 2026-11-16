import crypto from "node:crypto";
import { getClient } from "./client";

/**
 * Desk device tokens — how the desktop identifies itself to the server.
 *
 * A token is a `hdc_`-prefixed random string shown exactly once at creation.
 * Only its SHA-256 is stored, so a database read can never reproduce the token
 * that would get a machine back in. `verifyDeskToken` refuses revoked and
 * unknown tokens and stamps `last_used_at` so the admin console can show you a
 * live list of who is connected.
 */

export const DESK_TOKEN_PREFIX = "hdc_";

export interface DeskDevice {
  id: string;
  email: string;
  label: string;
  prefix: string;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedReason: string | null;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newDeskToken(): string {
  return `${DESK_TOKEN_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

export async function createDeskDevice(input: {
  email: string;
  label: string;
  createdBy: string;
}): Promise<{ device: DeskDevice; token: string }> {
  const client = getClient();
  const token = newDeskToken();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO desk_devices (id, email, label, token_hash, prefix, created_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.email, input.label.slice(0, 80), hashToken(token), token.slice(0, 6), now, input.createdBy.slice(0, 120)],
  });
  return { device: await deskDeviceById(id) as DeskDevice, token };
}

export async function deskDeviceById(id: string): Promise<DeskDevice | null> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM desk_devices WHERE id = ?", args: [id] });
  return res.rows[0] ? (mapRow(res.rows[0] as Record<string, unknown>) ?? null) : null;
}

export async function listDeskDevices(opts: { includeRevoked?: boolean } = {}): Promise<DeskDevice[]> {
  const client = getClient();
  const sql = opts.includeRevoked
    ? "SELECT * FROM desk_devices ORDER BY created_at DESC"
    : "SELECT * FROM desk_devices WHERE revoked_at IS NULL ORDER BY created_at DESC";
  const res = await client.execute(sql);
  const out: DeskDevice[] = [];
  for (const row of res.rows) {
    const m = mapRow(row as Record<string, unknown>);
    if (m) out.push(m);
  }
  return out;
}

/** Verify a bearer token. On success returns the device and touches last_used. */
export async function verifyDeskToken(
  token: string,
): Promise<{ ok: boolean; device?: DeskDevice; error?: "missing" | "unknown" | "revoked" }> {
  if (!token.startsWith(DESK_TOKEN_PREFIX)) return { ok: false, error: "unknown" };
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM desk_devices WHERE token_hash = ?", args: [hashToken(token)] });
  if (res.rows.length === 0) return { ok: false, error: "unknown" };
  const device = mapRow(res.rows[0] as Record<string, unknown>);
  if (!device) return { ok: false, error: "unknown" };
  if (device.revokedAt) return { ok: false, error: "revoked" };
  await client
    .execute({ sql: "UPDATE desk_devices SET last_used_at = ? WHERE id = ?", args: [new Date().toISOString(), device.id] })
    .catch(() => undefined);
  return { ok: true, device };
}

export async function revokeDeskDevice(input: { id: string; by: string; reason?: string }): Promise<DeskDevice | null> {
  const client = getClient();
  const existing = await deskDeviceById(input.id);
  if (!existing) return null;
  await client.execute({
    sql: "UPDATE desk_devices SET revoked_at = ?, revoked_by = ?, revoked_reason = ? WHERE id = ?",
    args: [new Date().toISOString(), input.by.slice(0, 120), (input.reason ?? "").slice(0, 300), input.id],
  });
  return deskDeviceById(input.id);
}

function mapRow(row: Record<string, unknown>): DeskDevice | null {
  if (!row.id) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    label: String(row.label ?? ""),
    prefix: String(row.prefix ?? ""),
    createdAt: String(row.created_at ?? ""),
    createdBy: row.created_by ? String(row.created_by) : null,
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    revokedBy: row.revoked_by ? String(row.revoked_by) : null,
    revokedReason: row.revoked_reason ? String(row.revoked_reason) : null,
  };
}