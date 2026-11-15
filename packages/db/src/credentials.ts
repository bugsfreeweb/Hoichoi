import type { Client } from "@libsql/client";
import { getClient, nowIso } from "./client";

/**
 * Credential expiry.
 *
 * `credentialState` is pure and unit-tested: the whole feature is "notice before
 * the key dies", so the arithmetic (and the boundary days) must be right even
 * when no mail transport is configured.
 */

export type CredentialScope = "provider" | "storage" | "mail" | "vcs" | "infra" | "other";

export type CredentialState = "ok" | "due" | "expired";

export interface CredentialRow {
  id: string;
  name: string;
  scope: CredentialScope;
  owner_email: string | null;
  expires_at: string;
  warn_days: number;
  notes: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialStatus {
  state: CredentialState;
  /** Whole days until expiry (negative once expired). */
  daysLeft: number;
  /** ISO timestamp or null when the value is unparseable. */
  expiresAt: string | null;
}

const DAY_MS = 86_400_000;

/** Classify one credential. Unparseable dates are "expired": fail loud, not silent. */
export function credentialState(expiresAt: string | null | undefined, now: number, warnDays = 7): CredentialStatus {
  if (!expiresAt) return { state: "ok", daysLeft: Number.POSITIVE_INFINITY, expiresAt: null };
  const at = Date.parse(expiresAt);
  if (!Number.isFinite(at)) return { state: "expired", daysLeft: 0, expiresAt: null };
  const daysLeft = Math.floor((at - now) / DAY_MS);
  const state: CredentialState = at <= now ? "expired" : daysLeft <= Math.max(0, warnDays) ? "due" : "ok";
  return { state, daysLeft, expiresAt: new Date(at).toISOString() };
}

/** True when a row should be warned about today (due or expired) and was not already mailed today. */
export function shouldNotify(row: Pick<CredentialRow, "expires_at" | "warn_days" | "last_notified_at">, now: number): boolean {
  const status = credentialState(row.expires_at, now, row.warn_days);
  if (status.state === "ok") return false;
  if (!row.last_notified_at) return true;
  const last = Date.parse(row.last_notified_at);
  if (!Number.isFinite(last)) return true;
  return now - last >= DAY_MS;
}

function mapCredential(row: Record<string, unknown>): CredentialRow {
  return {
    id: String(row.id),
    name: String(row.name),
    scope: String(row.scope ?? "other") as CredentialScope,
    owner_email: row.owner_email === null || row.owner_email === undefined ? null : String(row.owner_email),
    expires_at: String(row.expires_at),
    warn_days: Number(row.warn_days ?? 7),
    notes: row.notes === null || row.notes === undefined ? null : String(row.notes),
    last_notified_at:
      row.last_notified_at === null || row.last_notified_at === undefined ? null : String(row.last_notified_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listCredentials(db?: Client): Promise<CredentialRow[]> {
  const client = db ?? getClient();
  const res = await client.execute(
    "SELECT * FROM credentials ORDER BY expires_at ASC",
  );
  return res.rows.map((r) => mapCredential(r as Record<string, unknown>));
}

export interface CredentialInput {
  name: string;
  scope?: CredentialScope;
  owner_email?: string | null;
  expires_at: string;
  warn_days?: number;
  notes?: string | null;
}

/**
 * Create or update by name (the name is the natural key — "GitHub PAT" should be
 * one row that gets renewed, not a new row every time it rotates).
 */
export async function upsertCredential(input: CredentialInput, db?: Client): Promise<CredentialRow> {
  const client = db ?? getClient();
  const now = nowIso();
  const name = input.name.trim();
  if (!name) throw new Error("credential name is required");
  const expires = Date.parse(input.expires_at);
  if (!Number.isFinite(expires)) throw new Error("expires_at must be an ISO date");
  const warnDays = Math.min(Math.max(Math.trunc(input.warn_days ?? 7), 0), 90);

  const existing = await client.execute({ sql: "SELECT id FROM credentials WHERE name = ?", args: [name] });
  if (existing.rows.length > 0) {
    const id = String((existing.rows[0] as Record<string, unknown>).id);
    await client.execute({
      sql: `UPDATE credentials
               SET scope = ?, owner_email = ?, expires_at = ?, warn_days = ?, notes = ?, updated_at = ?,
                   last_notified_at = CASE WHEN expires_at = ? THEN last_notified_at ELSE NULL END
             WHERE id = ?`,
      args: [
        input.scope ?? "other",
        input.owner_email?.trim().toLowerCase() || null,
        new Date(expires).toISOString(),
        warnDays,
        input.notes?.trim() || null,
        now,
        new Date(expires).toISOString(),
        id,
      ],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO credentials (id, name, scope, owner_email, expires_at, warn_days, notes, last_notified_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      args: [
        crypto.randomUUID(),
        name,
        input.scope ?? "other",
        input.owner_email?.trim().toLowerCase() || null,
        new Date(expires).toISOString(),
        warnDays,
        input.notes?.trim() || null,
        now,
        now,
      ],
    });
  }
  const rows = await client.execute({ sql: "SELECT * FROM credentials WHERE name = ?", args: [name] });
  return mapCredential(rows.rows[0] as Record<string, unknown>);
}

export async function deleteCredential(id: string, db?: Client): Promise<number> {
  const client = db ?? getClient();
  const res = await client.execute({ sql: "DELETE FROM credentials WHERE id = ?", args: [id] });
  return res.rowsAffected;
}

/** Rows that need a warning at `now` and have not been mailed in the last 24h. */
export async function credentialsDue(now = Date.now(), db?: Client): Promise<{ row: CredentialRow; status: CredentialStatus }[]> {
  const rows = await listCredentials(db);
  return rows
    .filter((row) => shouldNotify(row, now))
    .map((row) => ({ row, status: credentialState(row.expires_at, now, row.warn_days) }));
}

export async function markNotified(ids: string[], now = Date.now(), db?: Client): Promise<void> {
  if (ids.length === 0) return;
  const client = db ?? getClient();
  for (const id of ids) {
    await client.execute({
      sql: "UPDATE credentials SET last_notified_at = ? WHERE id = ?",
      args: [new Date(now).toISOString(), id],
    });
  }
}
