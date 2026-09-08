/**
 * Archive lifecycle — rolling window rollover + retention purge.
 * Sits in @hoichoi/db (not the scraper) so the serverless web admin can
 * run it without pulling in Playwright/tsx. Purely SQL over the Turso client.
 */
import { getClient, nowIso } from "./client";

export interface ArchiveReport {
  rolledOver: number;
  purged: number;
  purgedIds: string[];
}

async function settings(): Promise<{ visibleDays: number; retentionDays: number }> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM settings WHERE id = 1");
  const row = (res.rows[0] ?? {}) as Record<string, unknown>;
  return {
    visibleDays: Number(row.archive_visible_days ?? 7),
    retentionDays: Number(row.archive_retention_days ?? 30),
  };
}

/**
 * Auto-rollover — close the public window for posts whose 7-day window has
 * lapsed. Active missing-children cases and legal-hold posts stay live.
 * These posts remain accessible in the admin archive for retention days.
 */
export async function checkAndArchive(log: (m: string) => void = () => {}): Promise<number> {
  const { visibleDays } = await settings();
  const client = getClient();
  const now = nowIso();
  const res = await client.execute({
    sql: `
      UPDATE posts
      SET archived_at = ?, archive_reason = 'auto_rollover', updated_at = ?
      WHERE status = 'published'
        AND archived_at IS NULL
        AND NOT (category = 'missing-children' AND case_status = 'active')
        AND NOT legal_hold
        AND strftime('%s', published_at) < strftime('%s', 'now') - ?
    `,
    args: [now, now, visibleDays * 86400],
  });
  const n = Number(res.rowsAffected ?? 0);
  if (n > 0) log(`[archive] auto-rolled over ${n} posts (after ${visibleDays}d window)`);
  return n;
}

/**
 * Retention purge — hard-delete content after archive_retention_days.
 * Skips legal_hold posts and active missing-children cases.
 */
export async function purgeExpired(log: (m: string) => void = () => {}): Promise<ArchiveReport> {
  const { retentionDays } = await settings();
  const client = getClient();
  const res = await client.execute({
    sql: `
      SELECT id FROM posts
      WHERE archived_at IS NOT NULL
        AND strftime('%s', archived_at) < strftime('%s', 'now') - ?
        AND NOT legal_hold
        AND NOT (category = 'missing-children' AND case_status = 'active')
    `,
    args: [retentionDays * 86400],
  });
  const ids = res.rows.map((r) => String(r.id));
  if (ids.length === 0) return { rolledOver: 0, purged: 0, purgedIds: [] };

  const placeholders = ids.map(() => "?").join(",");
  await client.execute({
    sql: `DELETE FROM posts WHERE id IN (${placeholders})`,
    args: ids,
  });
  // Remove orphan vectors (libSQL vec0 stores its own row per post_id).
  for (const id of ids) {
    await client.execute({ sql: "DELETE FROM posts_vec WHERE post_id = ?", args: [id] });
  }
  log(`[archive] purged ${ids.length} posts past ${retentionDays}d retention`);
  return { rolledOver: 0, purged: ids.length, purgedIds: ids };
}

/** Full lifecycle pass — rollover then purge. */
export async function runArchivePass(
  log: (m: string) => void = () => {},
): Promise<ArchiveReport> {
  const rolled = await checkAndArchive(log);
  const { purged, purgedIds } = await purgeExpired(log);
  return { rolledOver: rolled, purged, purgedIds };
}