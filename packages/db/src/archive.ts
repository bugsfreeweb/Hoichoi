/**
 * Archive lifecycle — rolling window rollover + retention purge.
 * Sits in @hoichoi/db (not the scraper) so the serverless web admin can
 * run it without pulling in Playwright/tsx. Purely SQL over the Turso client.
 */
import { getClient, nowIso } from "./client";
import { logDeletion } from "./deletion-log";

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
 *
 * `CAST(… AS INTEGER)` is not decoration. `strftime('%s', x)` returns **TEXT**
 * in SQLite, and SQLite orders by storage class before value, so every TEXT
 * compares *greater* than every number. Comparing the timestamp string against
 * `strftime('%s','now') - n` (a number) was therefore true for every row, and —
 * with the `<` direction — false for every row. This update matched nothing for a
 * month while the daily job reported success: 1 057 published posts older than
 * seven days were still marked live.
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
        AND CAST(strftime('%s', published_at) AS INTEGER)
          < CAST(strftime('%s', 'now') AS INTEGER) - ?
    `,
    args: [now, now, visibleDays * 86400],
  });
  const n = Number(res.rowsAffected ?? 0);
  if (n > 0) log(`[archive] auto-rolled over ${n} posts (after ${visibleDays}d window)`);
  return n;
}

/**
 * Retention purge — hard-delete archived content past the retention clock.
 *
 * Two clocks, because "deleted after 30 days" has to mean the same thing whether
 * a post rolled over on schedule or was archived late (a backfill, a manual
 * archive, a database that had not been rolled over for a month):
 *
 *   • `archived_at` older than `archive_retention_days` — the normal path: seven
 *     live days, then `retention` days in the archive, then gone.
 *   • `published_at` older than `visible + retention` days — the catch-up path:
 *     a post that is already three months old is not given another thirty days
 *     just because it happened to be archived today.
 *
 * Skips legal_hold posts and active missing-children cases, like rollover.
 */
export async function purgeExpired(log: (m: string) => void = () => {}): Promise<ArchiveReport> {
  const { visibleDays, retentionDays } = await settings();
  const client = getClient();
  const res = await client.execute({
    sql: `
      SELECT id FROM posts
      WHERE archived_at IS NOT NULL
        AND (
          CAST(strftime('%s', archived_at) AS INTEGER)
            < CAST(strftime('%s', 'now') AS INTEGER) - ?
          OR CAST(strftime('%s', published_at) AS INTEGER)
            < CAST(strftime('%s', 'now') AS INTEGER) - ?
        )
        AND NOT legal_hold
        AND NOT (category = 'missing-children' AND case_status = 'active')
    `,
    args: [retentionDays * 86400, (retentionDays + visibleDays) * 86400],
  });
  const ids = res.rows.map((r) => String(r.id));
  if (ids.length === 0) return { rolledOver: 0, purged: 0, purgedIds: [] };

  // Snapshot what is about to be lost *before* deleting: the ledger cannot
  // reconstruct a title from a row that no longer exists.
  const snap = await client.execute({
    sql: `SELECT * FROM posts WHERE id IN (${ids.map(() => "?").join(",")})`,
    args: ids,
  });

  const placeholders = ids.map(() => "?").join(",");
  await client.execute({
    sql: `DELETE FROM posts WHERE id IN (${placeholders})`,
    args: ids,
  });
  // Remove orphan vectors (libSQL vec0 stores its own row per post_id). The vec
  // module is absent on local `file:` databases, so a missing table must not
  // block a purge that has already read its ledger rows.
  for (const id of ids) {
    try {
      await client.execute({ sql: "DELETE FROM posts_vec WHERE post_id = ?", args: [id] });
    } catch {
      /* no vector table here */
    }
  }
  for (const row of snap.rows) {
    await logDeletion({
      entityType: "post",
      entityId: String(row.id),
      reason: `retention ${retentionDays}d`,
      actor: "archive:purge",
      detail: {
        title_bn: row.title_bn ? String(row.title_bn) : null,
        slug: row.slug ? String(row.slug) : null,
        category: row.category ? String(row.category) : null,
        media_path: row.media_path ? String(row.media_path) : null,
        published_at: row.published_at ? String(row.published_at) : null,
      },
    }).catch(() => undefined);
  }
  log(`[archive] purged ${ids.length} posts past ${retentionDays}d retention`);
  return { rolledOver: 0, purged: ids.length, purgedIds: ids };
}

/**
 * Age of a post, in whole days, from its publication (falling back to creation).
 * Exported because three surfaces — the web archive page, the desk screen and the
 * runner CLI — must agree on what "over N days" means.
 */
export const POST_AGE_DAYS_SQL = `CAST((CAST(strftime('%s','now') AS INTEGER)
  - CAST(strftime('%s', COALESCE(published_at, created_at)) AS INTEGER)) / 86400 AS INTEGER)`;

export interface ExpiredListRow {
  id: string;
  title_bn: string;
  slug: string;
  category: string;
  status: string;
  published_at: string | null;
  archived_at: string | null;
  age_days: number;
  legal_hold: number;
  is_active_case: number;
}

/**
 * Posts older than `days`, whatever their archive state.
 *
 * This is the operator's view of "what is over the line": the retention purge
 * deletes archived rows, but an operator asking "what is older than 30 days?"
 * wants to see live stragglers too — a database that was never rolled over is
 * exactly how a site ends up serving two-month-old news.
 */
export async function listExpiredPosts(
  days: number,
  limit = 200,
): Promise<ExpiredListRow[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT id, title_bn, slug, category, status, published_at, archived_at,
            ${POST_AGE_DAYS_SQL} AS age_days,
            legal_hold,
            CASE WHEN category = 'missing-children' AND case_status = 'active' THEN 1 ELSE 0 END AS is_active_case
          FROM posts
          WHERE ${POST_AGE_DAYS_SQL} >= ?
          ORDER BY COALESCE(published_at, created_at) ASC
          LIMIT ?`,
    args: [days, limit],
  });
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row.id),
      title_bn: String(row.title_bn ?? ""),
      slug: String(row.slug ?? ""),
      category: String(row.category ?? ""),
      status: String(row.status ?? ""),
      published_at: row.published_at ? String(row.published_at) : null,
      archived_at: row.archived_at ? String(row.archived_at) : null,
      age_days: Number(row.age_days ?? 0),
      legal_hold: Number(row.legal_hold ?? 0),
      is_active_case: Number(row.is_active_case ?? 0),
    };
  });
}

/** How many posts are older than `days` (the number the console shows before deleting). */
export async function countExpiredPosts(days: number): Promise<number> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM posts WHERE ${POST_AGE_DAYS_SQL} >= ?`,
    args: [days],
  });
  return Number((res.rows[0] as unknown as Record<string, unknown>)?.n ?? 0);
}

export interface AgeDeleteReport {
  deleted: number;
  ids: string[];
  /** Posts the age rule matched but the guards protected. */
  skippedLegalHold: number;
  skippedActiveCase: number;
  /** Rows already past retention that the caller may still delete by id. */
  kept: number;
}

/**
 * A human decision to delete everything older than `days`.
 *
 * Same guards as the automatic purge — a legal hold and a live missing-children
 * case are not deletable by an age rule — but the actor and the reason are the
 * operator's, and every row is snapshotted into the deletion ledger before the
 * delete, one ledger row per post.
 */
export async function deletePostsOlderThan(
  days: number,
  actor: string,
  log: (m: string) => void = () => {},
): Promise<AgeDeleteReport> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT id, title_bn, slug, category, media_path, published_at, created_at,
            legal_hold,
            CASE WHEN category = 'missing-children' AND case_status = 'active' THEN 1 ELSE 0 END AS is_active_case
          FROM posts
          WHERE ${POST_AGE_DAYS_SQL} >= ?`,
    args: [days],
  });
  const all = res.rows as unknown as Array<Record<string, unknown>>;
  const deletable = all.filter((r) => Number(r.legal_hold ?? 0) !== 1 && Number(r.is_active_case ?? 0) !== 1);
  const skippedLegalHold = all.filter((r) => Number(r.legal_hold ?? 0) === 1).length;
  const skippedActiveCase = all.filter(
    (r) => Number(r.legal_hold ?? 0) !== 1 && Number(r.is_active_case ?? 0) === 1,
  ).length;
  const ids = deletable.map((r) => String(r.id));
  if (ids.length === 0) {
    return { deleted: 0, ids: [], skippedLegalHold, skippedActiveCase, kept: 0 };
  }

  const placeholders = ids.map(() => "?").join(",");
  await client.execute({ sql: `DELETE FROM posts WHERE id IN (${placeholders})`, args: ids });
  for (const id of ids) {
    try {
      await client.execute({ sql: "DELETE FROM posts_vec WHERE post_id = ?", args: [id] });
    } catch {
      /* no vector table on a local file database */
    }
  }
  // The ledger is written after the delete succeeded — never before, so a failed
  // delete never leaves a row claiming something vanished.
  for (const row of deletable) {
    await logDeletion({
      entityType: "post",
      entityId: String(row.id),
      reason: `age ${days}d by ${actor}`,
      actor,
      detail: {
        title_bn: row.title_bn ? String(row.title_bn) : null,
        slug: row.slug ? String(row.slug) : null,
        category: row.category ? String(row.category) : null,
        media_path: row.media_path ? String(row.media_path) : null,
        published_at: row.published_at ? String(row.published_at) : null,
      },
    }).catch(() => undefined);
  }
  log(`[archive] deleted ${ids.length} posts older than ${days}d by ${actor}`);
  return { deleted: ids.length, ids, skippedLegalHold, skippedActiveCase, kept: 0 };
}

/** A refused archive delete, carrying the reason the caller must explain. */
export class ArchiveDeleteRefused extends Error {
  constructor(
    public readonly reason: "not_found" | "not_archived" | "legal_hold",
    message: string,
  ) {
    super(message);
    this.name = "ArchiveDeleteRefused";
  }
}

/**
 * Permanently delete one archived post, by hand.
 *
 * Two guards, and both are the same ones the automatic purge applies: the post
 * must actually be archived (deleting live content goes through the editor, a
 * different audited path) and a legal hold blocks deletion. The row is removed
 * rather than soft-deleted; `raw_posts` keeps the original text, and the deletion
 * ledger keeps the fact.
 */
export async function deleteArchivedPost(
  id: string,
  actor: string,
): Promise<{ id: string; title_bn: string; slug: string }> {
  const client = getClient();
  const found = await client.execute({
    sql: "SELECT id, title_bn, slug, category, media_path, published_at, archived_at, legal_hold FROM posts WHERE id = ?",
    args: [id],
  });
  const row = found.rows[0] as unknown as Record<string, unknown> | undefined;
  if (!row) throw new ArchiveDeleteRefused("not_found", "post not found");
  if (!row.archived_at) {
    throw new ArchiveDeleteRefused("not_archived", "this post is not archived");
  }
  if (Number(row.legal_hold ?? 0) === 1) {
    throw new ArchiveDeleteRefused("legal_hold", "this post is under a legal hold");
  }

  await client.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  try {
    await client.execute({ sql: "DELETE FROM posts_vec WHERE post_id = ?", args: [id] });
  } catch {
    /* no vector table on a local file database */
  }
  await logDeletion({
    entityType: "post",
    entityId: id,
    reason: `manual archive delete by ${actor}`,
    actor,
    detail: {
      title_bn: row.title_bn ? String(row.title_bn) : null,
      slug: row.slug ? String(row.slug) : null,
      category: row.category ? String(row.category) : null,
      media_path: row.media_path ? String(row.media_path) : null,
      published_at: row.published_at ? String(row.published_at) : null,
    },
  }).catch(() => undefined);
  return {
    id,
    title_bn: String(row.title_bn ?? ""),
    slug: String(row.slug ?? ""),
  };
}

/** Full lifecycle pass — rollover then purge. */
export async function runArchivePass(
  log: (m: string) => void = () => {},
): Promise<ArchiveReport> {
  const rolled = await checkAndArchive(log);
  const { purged, purgedIds } = await purgeExpired(log);
  return { rolledOver: rolled, purged, purgedIds };
}