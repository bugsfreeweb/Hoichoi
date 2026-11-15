import type { Client } from "@libsql/client";
import { getClient, nowIso } from "./client";

/**
 * Admin audit trail — append only, on the pre-existing `admin_actions` table.
 *
 * Every console mutation writes here: who (email + role snapshot, so a deleted
 * user does not erase the record), what (dotted action), what it touched, a
 * human sentence, and a hashed IP. `recordAudit` is deliberately
 * fire-and-forget friendly: it swallows storage errors and returns false,
 * because a failed audit write must not roll back the action the operator just
 * took. Never put a secret in `metadata` — it is readable by every admin.
 */

export interface AuditEntry {
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
}

export interface AuditRow {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata_json: string | null;
  created_at: string;
}

export interface AuditQuery {
  limit?: number;
  offset?: number;
  actorEmail?: string;
  entityType?: string;
  action?: string;
  /** ISO timestamp lower bound. */
  since?: string;
}

function newId(): string {
  // 20 random bytes, hex — sortable enough for a UI, opaque to callers.
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function recordAudit(entry: AuditEntry, db?: Client): Promise<boolean> {
  try {
    const client = db ?? getClient();
    await client.execute({
      sql: `INSERT INTO admin_actions
              (id, admin_user_id, action, target_table, target_id, details, created_at, actor_email, actor_role, ip_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId(),
        entry.actorId ?? null,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        JSON.stringify({ summary: entry.summary.slice(0, 500), ...(entry.metadata ?? {}) }).slice(0, 4000),
        nowIso(),
        entry.actorEmail,
        entry.actorRole,
        entry.ipHash ?? null,
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function listAudit(opts: AuditQuery = {}, db?: Client): Promise<AuditRow[]> {
  const client = db ?? getClient();
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.actorEmail) {
    where.push("actor_email = ?");
    args.push(opts.actorEmail.trim().toLowerCase());
  }
  if (opts.entityType) {
    where.push("target_table = ?");
    args.push(opts.entityType);
  }
  if (opts.action) {
    where.push("action = ?");
    args.push(opts.action);
  }
  if (opts.since) {
    where.push("created_at >= ?");
    args.push(opts.since);
  }
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  args.push(limit, Math.max(opts.offset ?? 0, 0));
  const res = await client.execute({
    sql: `SELECT id, actor_email, actor_role, action, target_table, target_id, details, created_at
          FROM admin_actions
          ${where.length ? "WHERE " + where.join(" AND ") : ""}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args,
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      actor_email: String(row.actor_email),
      actor_role: String(row.actor_role),
      action: String(row.action),
      entity_type: String(row.target_table ?? ""),
      entity_id: row.target_id === null || row.target_id === undefined ? null : String(row.target_id),
      summary: String(row.details ?? ""),
      metadata_json: null,
      created_at: String(row.created_at),
    };
  });
}

export async function countAudit(opts: Omit<AuditQuery, "limit" | "offset"> = {}, db?: Client): Promise<number> {
  const client = db ?? getClient();
  const where: string[] = [];
  const args: string[] = [];
  if (opts.actorEmail) {
    where.push("actor_email = ?");
    args.push(opts.actorEmail.trim().toLowerCase());
  }
  if (opts.entityType) {
    where.push("target_table = ?");
    args.push(opts.entityType);
  }
  if (opts.action) {
    where.push("action = ?");
    args.push(opts.action);
  }
  if (opts.since) {
    where.push("created_at >= ?");
    args.push(opts.since);
  }
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM admin_actions ${where.length ? "WHERE " + where.join(" AND ") : ""}`,
    args,
  });
  return Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}
