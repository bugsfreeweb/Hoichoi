/**
 * @hoichoi/db — Turso/libSQL data layer for হইচই.
 * Exports the client plus typed helpers used by the web app and the scraper.
 */
export * from "./client";
export * from "./rows";
export * from "./archive";
export * from "./media";

import type {
  CategoryMeta,
  CategorySlug,
  CurrentWindowPost,
  Post,
  PostStatus,
  StatsSnapshot,
} from "@hoichoi/shared-types";
import { getClient, nowIso } from "./client";
import { mapCategory, mapPost, parseJson } from "./rows";

export async function listCategories(): Promise<CategoryMeta[]> {
  const client = getClient();
  const res = await client.execute(
    "SELECT * FROM category_configs ORDER BY sort_order ASC",
  );
  return res.rows.map((r) => mapCategory(r as Record<string, unknown>));
}

export async function getCategory(slug: string): Promise<CategoryMeta | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM category_configs WHERE slug = ?",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapCategory(res.rows[0] as Record<string, unknown>);
}

export interface WindowOptions {
  category?: CategorySlug | null;
  limit?: number;
  offset?: number;
}

/** Public rolling-window posts — uses posts_current_window view. */
export async function windowPosts(
  opts: WindowOptions = {},
): Promise<CurrentWindowPost[]> {
  const client = getClient();
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  const rows = opts.category
    ? await client.execute({
        sql: "SELECT * FROM posts_current_window WHERE category = ? ORDER BY published_at DESC LIMIT ? OFFSET ?",
        args: [opts.category, limit, offset],
      })
    : await client.execute({
        sql: "SELECT * FROM posts_current_window ORDER BY published_at DESC LIMIT ? OFFSET ?",
        args: [limit, offset],
      });
  return rows.rows.map((r) => {
    const post = mapPost(r as Record<string, unknown>);
    const ttlMs = Number((r as Record<string, unknown>).ttl_ms ?? 0);
    return { ...post, ttl_ms: ttlMs };
  });
}

export async function countWindowPosts(category?: CategorySlug): Promise<number> {
  const client = getClient();
  const res = category
    ? await client.execute({
        sql: "SELECT count(*) AS n FROM posts_current_window WHERE category = ?",
        args: [category],
      })
    : await client.execute("SELECT count(*) AS n FROM posts_current_window");
  return Number(res.rows[0]?.n ?? 0);
}

/** Public post lookup — only published + in the visible window. */
export async function getPublicPostBySlug(slug: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

/** Admin-oriented lookup — any status, includes archived. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

export async function getPostById(id: string): Promise<Post | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return mapPost(res.rows[0] as Record<string, unknown>);
}

export async function relatedPosts(
  post: Post,
  limit = 3,
): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window WHERE category = ? AND id != ? ORDER BY published_at DESC LIMIT ?",
    args: [post.category, post.id, limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/** Latest published headlines (breaking ticker). */
export async function breakingHeadlines(limit = 6): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts_current_window ORDER BY published_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/** "Most read" = most recently updated/published, ranked by recency for now. */
export async function mostRead(limit = 5): Promise<Post[]> {
  return breakingHeadlines(limit);
}

/** Live monitor stats for the public homepage + admin dashboard. */
export async function statsSnapshot(): Promise<StatsSnapshot> {
  const client = getClient();
  const today = nowIso().slice(0, 10);
  const [collected, dupes, published, pending, byCat, lastRun] =
    await Promise.all([
      client.execute({
        sql: "SELECT count(*) AS n FROM raw_posts WHERE scraped_at LIKE ?",
        args: [`${today}%`],
      }),
      client.execute(
        "SELECT count(*) AS n FROM raw_posts WHERE phash IS NOT NULL AND phash IN (SELECT phash FROM raw_posts GROUP BY phash HAVING count(*) > 1)",
      ),
      client.execute("SELECT count(*) AS n FROM posts_current_window"),
      client.execute({
        sql: "SELECT count(*) AS n FROM posts WHERE status = ?",
        args: ["pending_review"],
      }),
      client.execute(
        "SELECT category, count(*) AS n FROM posts_current_window GROUP BY category",
      ),
      client.execute(
        "SELECT status, error FROM pipeline_runs ORDER BY started_at DESC LIMIT 1",
      ),
    ]);
  const total = Number(published.rows[0]?.n ?? 0);
  const dupeCount = Number(dupes.rows[0]?.n ?? 0);
  const byCategory: Record<CategorySlug, number> = {
    "child-sexual-abuse": 0,
    "extramarital-crime": 0,
    "missing-children": 0,
  };
  for (const r of byCat.rows) {
    const key = String(r.category) as CategorySlug;
    if (key in byCategory) byCategory[key] = Number(r.n);
  }
  const lastStatusRow = lastRun.rows[0];
  const lastRunStatus: StatsSnapshot["lastRunStatus"] = !lastStatusRow
    ? "never"
    : String(lastStatusRow.status) === "running"
      ? "never"
      : String(lastStatusRow.status) === "completed"
        ? "success"
        : "failed";
  return {
    collectedToday: Number(collected.rows[0]?.n ?? 0),
    duplicatesBlocked: dupeCount,
    dedupRate: total + dupeCount > 0 ? Math.round((dupeCount / (total + dupeCount)) * 100) : 0,
    lastRunStatus,
    published: total,
    pendingReview: Number(pending.rows[0]?.n ?? 0),
    byCategory,
  };
}

export interface RecentPipelineRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  stats: Record<string, unknown> | null;
  provider_used: string | null;
  error: string | null;
}

export async function recentPipelineRuns(limit = 10): Promise<RecentPipelineRun[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      started_at: String(row.started_at),
      finished_at: (row.finished_at as string | null) ?? null,
      status: String(row.status),
      stats: parseJson<Record<string, unknown> | null>(row.stats as string, null),
      provider_used: (row.provider_used as string | null) ?? null,
      error: (row.error as string | null) ?? null,
    };
  });
}

export async function listStatusPosts(status: PostStatus): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC",
    args: [status],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

export async function updatePostStatus(
  id: string,
  status: PostStatus,
  extra: { publishedAt?: boolean } = {},
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE posts SET status = ?, updated_at = ? , published_at = COALESCE(published_at, CASE WHEN ? = 1 THEN ? ELSE published_at END) WHERE id = ?",
    args: [
      status,
      nowIso(),
      extra.publishedAt ? 1 : 0,
      nowIso(),
      id,
    ],
  });
}