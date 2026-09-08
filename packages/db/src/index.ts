/**
 * @hoichoi/db — Turso/libSQL data layer for হইচই.
 * Exports the client plus typed helpers used by the web app and the scraper.
 */
export * from "./client";
export * from "./rows";
export * from "./archive";
export * from "./media";
export * from "./transfer";

import type {
  CaseStatus,
  CategoryMeta,
  CategorySlug,
  CurrentWindowPost,
  Post,
  PostStatus,
  SiteSettings,
  StatsSnapshot,
} from "@hoichoi/shared-types";
import type { InValue } from "@libsql/client";
import { getClient, nowIso } from "./client";
import { mapCategory, mapPost, parseJson } from "./rows";

/** Fallback branding used when no settings row exists / columns are absent. */
export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  pipeline_hours: 2,
  site_name: "হইচই",
  contact_email: "contact@hoichoi.local",
  police_helpline: "999",
  child_helpline: "109",
  archive_visible_days: 7,
  archive_retention_days: 30,
  slogan_bn: "ভাইরাল বাংলা, সপ্তাহখানেক",
  tagline: "ফেসবুকের হইচই — এখন বাংলায়, সাত দিন পর উবে যায়",
  logo_url: null,
  favicon_url: null,
  accent_color: "#d64541",
};

export function mapSettings(row: Record<string, unknown>): SiteSettings {
  const str = (v: unknown, fallback = "") => String(v ?? fallback);
  return {
    id: 1,
    pipeline_hours: Number(row.pipeline_hours ?? DEFAULT_SETTINGS.pipeline_hours),
    site_name: str(row.site_name, DEFAULT_SETTINGS.site_name),
    contact_email: str(row.contact_email),
    police_helpline: str(row.police_helpline, DEFAULT_SETTINGS.police_helpline),
    child_helpline: str(row.child_helpline, DEFAULT_SETTINGS.child_helpline),
    archive_visible_days: Number(row.archive_visible_days ?? DEFAULT_SETTINGS.archive_visible_days),
    archive_retention_days: Number(row.archive_retention_days ?? DEFAULT_SETTINGS.archive_retention_days),
    slogan_bn: str(row.slogan_bn, DEFAULT_SETTINGS.slogan_bn),
    tagline: str(row.tagline, DEFAULT_SETTINGS.tagline),
    logo_url: (row.logo_url as string | null) ?? null,
    favicon_url: (row.favicon_url as string | null) ?? null,
    accent_color: str(row.accent_color, DEFAULT_SETTINGS.accent_color),
  };
}

/** Single source of truth for site settings (branding + pipeline cadence). */
export async function getSettings(): Promise<SiteSettings> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM settings WHERE id = 1");
  if (res.rows.length === 0) return DEFAULT_SETTINGS;
  return mapSettings(res.rows[0] as Record<string, unknown>);
}

/** Whitelisted, idempotent settings update (skips unknown keys). */
export async function updateSettings(fields: Partial<SiteSettings>): Promise<void> {
  const client = getClient();
  const allowed: Array<keyof SiteSettings> = [
    "pipeline_hours",
    "site_name",
    "contact_email",
    "police_helpline",
    "child_helpline",
    "archive_visible_days",
    "archive_retention_days",
    "slogan_bn",
    "tagline",
    "logo_url",
    "favicon_url",
    "accent_color",
  ];
  if (fields.logo_url === "") fields.logo_url = null;
  if (fields.favicon_url === "") fields.favicon_url = null;
  const sets: string[] = [];
  const args: InValue[] = [];
  for (const k of allowed) {
    const v = fields[k];
    if (v === undefined) continue;
    if (v === null && k !== "logo_url" && k !== "favicon_url") continue;
    sets.push(`${k} = ?`);
    args.push(v as InValue);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(nowIso());
  await client.execute({ sql: `UPDATE settings SET ${sets.join(", ")} WHERE id = 1`, args });
}

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
  const [collected, dupes, published, pending, byCat, lastRun, avgDur] =
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
      client.execute(
        "SELECT AVG((julianday(finished_at) - julianday(started_at)) * 86400) AS avg_sec FROM pipeline_runs WHERE status = 'completed' AND finished_at IS NOT NULL",
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
    avgRunDurationSec: Math.round(Number(avgDur.rows[0]?.avg_sec ?? 0)),
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

export const POST_STATUSES: PostStatus[] = [
  "pending_review",
  "approved",
  "rejected",
  "published",
  "removed",
];

export const CASE_STATUSES: CaseStatus[] = [
  "active",
  "found",
  "unresolved",
  "false-alarm",
  "unknown",
];

export const CATEGORY_SLUGS: CategorySlug[] = [
  "child-sexual-abuse",
  "extramarital-crime",
  "missing-children",
];

/** All posts, newest first (content-manager list + search space). */
export async function listPosts(limit = 300): Promise<Post[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM posts ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => mapPost(r as Record<string, unknown>));
}

/** Content fields that may be edited through the admin post editor. */
export interface PostUpdateFields {
  title_bn?: string;
  body_bn?: string;
  summary_bn?: string | null;
  category?: CategorySlug;
  case_status?: CaseStatus | null;
  published_at?: string | null;
}

/**
 * PATCH content fields on a post. Every key is validated/whitelisted; invalid
 * enums throw. `summary_bn` / `case_status` / `published_at` may be set to null
 * (clear). Status changes go through `updatePostStatus` (see API route).
 */
export async function updatePost(id: string, fields: PostUpdateFields): Promise<void> {
  const client = getClient();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (typeof fields.title_bn === "string") {
    sets.push("title_bn = ?");
    args.push(fields.title_bn);
  }
  if (typeof fields.body_bn === "string") {
    sets.push("body_bn = ?");
    args.push(fields.body_bn);
  }
  if ("summary_bn" in fields && fields.summary_bn !== undefined) {
    sets.push("summary_bn = ?");
    args.push(fields.summary_bn ?? null);
  }
  if (fields.category !== undefined) {
    if (!CATEGORY_SLUGS.includes(fields.category)) {
      throw new Error(`invalid category: ${fields.category}`);
    }
    sets.push("category = ?");
    args.push(fields.category);
  }
  if ("case_status" in fields && fields.case_status !== undefined) {
    if (fields.case_status !== null && !CASE_STATUSES.includes(fields.case_status)) {
      throw new Error(`invalid case_status: ${fields.case_status}`);
    }
    sets.push("case_status = ?");
    args.push(fields.case_status ?? null);
    if (fields.case_status) {
      sets.push("case_updated_at = ?");
      args.push(nowIso());
    }
  }
  if ("published_at" in fields && fields.published_at !== undefined) {
    sets.push("published_at = ?");
    args.push(fields.published_at ?? null);
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(nowIso(), id);
  await client.execute({
    sql: `UPDATE posts SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

/** Hard-delete a post (content manager); caller handles audit logging. */
export async function deletePost(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
}