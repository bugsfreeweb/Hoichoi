/**
 * Source error inbox — scrape/upload failures tracked per source so the desk
 * console can surface "scrape health" and let an operator retry or dismiss.
 */
import { randomBytes } from "node:crypto";
import { getClient } from "./client";
import { nowIso } from "./client";
import type { SourceError } from "@hoichoi/shared-types";

/** Upsert a failure row (increments count and reopens when it recurs). */
export async function recordSourceError(
  sourceId: string,
  errKind: string,
  message: string,
): Promise<void> {
  const client = getClient();
  const now = nowIso();
  const existing = await client.execute({
    sql: "SELECT id, err_kind FROM source_errors WHERE source_id = ? AND err_kind = ? AND status = 'open' LIMIT 1",
    args: [sourceId, errKind],
  });
  if (existing.rows.length > 0) {
    const row = existing.rows[0] as unknown as { id: string };
    await client.execute({
      sql: "UPDATE source_errors SET count = count + 1, message = ?, last_seen_at = ?, status = 'open' WHERE id = ?",
      args: [message, now, row.id],
    });
    return;
  }
  const id = randomBytes(16).toString("hex");
  await client.execute({
    sql: "INSERT INTO source_errors (id, source_id, err_kind, message, status, count, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, 'open', 1, ?, ?)",
    args: [id, sourceId, errKind, message, now, now],
  });
}

/** Clear open errors for a source (successful scrape). */
export async function clearSourceErrors(sourceId: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "DELETE FROM source_errors WHERE source_id = ?",
    args: [sourceId],
  });
}

/** Mark an error resolved/dismissed without deleting history. */
export async function setSourceErrorStatus(
  id: string,
  status: "open" | "dismissed",
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE source_errors SET status = ? WHERE id = ?",
    args: [status, id],
  });
}

export async function listSourceErrors(): Promise<SourceError[]> {
  const client = getClient();
  const res = await client.execute(`
SELECT se.id, se.source_id, s.page_name AS source_name, se.err_kind, se.message,
       se.status, se.count, se.first_seen_at, se.last_seen_at
FROM source_errors se
LEFT JOIN sources s ON s.id = se.source_id
ORDER BY se.status = 'open' DESC, se.last_seen_at DESC
LIMIT 200
`);
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row.id),
      source_id: String(row.source_id),
      source_name: (row.source_name as string | null) ?? null,
      err_kind: String(row.err_kind),
      message: String(row.message),
      status: String(row.status) === "open" ? "open" : "dismissed",
      count: Number(row.count ?? 1),
      first_seen_at: String(row.first_seen_at),
      last_seen_at: String(row.last_seen_at),
    };
  });
}