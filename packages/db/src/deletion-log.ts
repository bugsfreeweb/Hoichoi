import { getClient } from "./client";

/**
 * Deletion ledger.
 *
 * Deletes are irreversible, so they get a row: what went, why, and who asked.
 * The row is written by the caller that actually performed the delete — never
 * "predicted" and never cleaned up later. This is a trail, not a promise to
 * restore (the bytes are gone), but it is what an operator or a complainer can
 * point at when someone asks "what happened to the post/media that was here?".
 */

export type DeletionEntityType = "post" | "media" | "comment" | "report" | "live_event";

function isoNow(): string {
  return new Date().toISOString();
}

export async function logDeletion(input: {
  entityType: DeletionEntityType;
  entityId: string;
  reason?: string | null;
  actor?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: `INSERT INTO deletion_log (id, entity_type, entity_id, reason, actor, detail_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      input.entityType,
      input.entityId,
      input.reason?.trim().slice(0, 500) || null,
      input.actor?.trim().slice(0, 200) || null,
      input.detail ? JSON.stringify(input.detail).slice(0, 2000) : null,
      isoNow(),
    ],
  });
}

export interface DeletionLogRow {
  id: string;
  entityType: DeletionEntityType;
  entityId: string;
  reason: string | null;
  actor: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

/** Admin console only — the ledger is intentionally non-public. */
export async function listDeletions(limit = 200): Promise<DeletionLogRow[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM deletion_log ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((row) => ({
    id: String(row.id),
    entityType: String(row.entity_type) as DeletionEntityType,
    entityId: String(row.entity_id),
    reason: row.reason ? String(row.reason) : null,
    actor: row.actor ? String(row.actor) : null,
    detail: row.detail_json ? (JSON.parse(String(row.detail_json)) as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
  }));
}

/** Deletion count for one entity — the guarantee a "what happened here?" check needs. */
export async function deletionCountFor(entityType: DeletionEntityType, entityId: string): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT COUNT(*) AS total FROM deletion_log WHERE entity_type = ? AND entity_id = ?",
    args: [entityType, entityId],
  });
  return Number((res.rows[0] as Record<string, unknown>).total);
}