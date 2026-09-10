/**
 * @hoichoi/db — Turso/libSQL data layer for হৈচৈ.
 * Exports the client plus typed helpers used by the web app and the scraper.
 */
export * from "./client";
export * from "./rows";
export * from "./archive";
export * from "./media";
export * from "./transfer";
export * from "./admin-auth";

import type {
  AnalyticsRange,
  AnalyticsSnapshot,
  CaseStatus,
  CategoryConfig,
  CategoryMeta,
  CategorySlug,
  Comment,
  CommentStatus,
  CommentWithPost,
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
  site_name: "হৈচৈ",
  contact_email: "contact@hoichoi.local",
  police_helpline: "999",
  child_helpline: "109",
  archive_visible_days: 7,
  archive_retention_days: 30,
  slogan_bn: "ভাইরাল বাংলা, সপ্তাহখানেক",
  tagline: "ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব",
  logo_url: null,
  favicon_url: null,
  accent_color: "#d64541",
  ad_leaderboard_html: null,
  ad_rect_html: null,
  ad_infeed_html: null,
  ad_strip_html: null,
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
    ad_leaderboard_html: (row.ad_leaderboard_html as string | null) ?? null,
    ad_rect_html: (row.ad_rect_html as string | null) ?? null,
    ad_infeed_html: (row.ad_infeed_html as string | null) ?? null,
    ad_strip_html: (row.ad_strip_html as string | null) ?? null,
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
    "ad_leaderboard_html",
    "ad_rect_html",
    "ad_infeed_html",
    "ad_strip_html",
  ];
  if (fields.logo_url === "") fields.logo_url = null;
  if (fields.favicon_url === "") fields.favicon_url = null;
  const adSlotKeys = ["ad_leaderboard_html", "ad_rect_html", "ad_infeed_html", "ad_strip_html"] as const;
  for (const k of adSlotKeys) {
    if (fields[k] === "") fields[k] = null;
  }
  const sets: string[] = [];
  const args: InValue[] = [];
  for (const k of allowed) {
    const v = fields[k];
    if (v === undefined) continue;
    if (v === null && k !== "logo_url" && k !== "favicon_url" && !adSlotKeys.includes(k as (typeof adSlotKeys)[number])) continue;
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
    "SELECT * FROM category_configs WHERE is_active = 1 ORDER BY sort_order ASC",
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

/** Create a new category (admin). */
export async function createCategory(input: {
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  dot?: string;
  config?: Partial<CategoryConfig>;
  sortOrder?: number;
}): Promise<void> {
  const client = getClient();
  const now = nowIso();
  const defaultConfig: CategoryConfig = {
    requires_double_approval: false,
    show_content_warning: false,
    auto_pending_review: false,
    redaction_strict: "standard",
    allow_identifying_details: true,
    publish_age_gate: false,
    use_allegation_language: false,
    supports_case_status: false,
    share_widely_cta: false,
    include_helpline_numbers: false,
    ...(input.config ?? {}),
  };
  await client.execute({
    sql: `INSERT INTO category_configs (slug, display_name_bn, display_name_en, description_bn, description_en, is_active, sort_order, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    args: [
      input.slug,
      input.displayNameBn,
      input.displayNameEn,
      input.descriptionBn ?? "",
      input.descriptionEn ?? "",
      input.sortOrder ?? 99,
      JSON.stringify(defaultConfig),
      now,
      now,
    ],
  });
}

/** Update an existing category (admin). */
export async function updateCategory(slug: string, fields: Partial<{
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  dot: string;
  config: Partial<CategoryConfig>;
}>): Promise<void> {
  const client = getClient();
  const sets: string[] = [];
  const args: InValue[] = [];
  const now = nowIso();

  if (fields.displayNameBn !== undefined) { sets.push("display_name_bn = ?"); args.push(fields.displayNameBn); }
  if (fields.displayNameEn !== undefined) { sets.push("display_name_en = ?"); args.push(fields.displayNameEn); }
  if (fields.descriptionBn !== undefined) { sets.push("description_bn = ?"); args.push(fields.descriptionBn); }
  if (fields.descriptionEn !== undefined) { sets.push("description_en = ?"); args.push(fields.descriptionEn); }
  if (fields.isActive !== undefined) { sets.push("is_active = ?"); args.push(fields.isActive ? 1 : 0); }
  if (fields.sortOrder !== undefined) { sets.push("sort_order = ?"); args.push(fields.sortOrder); }
  if (fields.dot !== undefined) { sets.push("dot = ?"); args.push(fields.dot); }
  if (fields.config !== undefined) {
    // Merge with existing config
    const existing = await getCategory(slug);
    const merged = { ...(existing?.config ?? {}), ...fields.config };
    sets.push("config = ?");
    args.push(JSON.stringify(merged));
  }

  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  args.push(now, slug);
  await client.execute({ sql: `UPDATE category_configs SET ${sets.join(", ")} WHERE slug = ?`, args });
}

/** Delete a category (admin) - only if no sources/posts reference it. */
export async function deleteCategory(slug: string): Promise<void> {
  const client = getClient();
  // Check references
  const [sourcesRef, postsRef] = await Promise.all([
    client.execute({ sql: "SELECT 1 FROM source_categories WHERE category_slug = ? LIMIT 1", args: [slug] }),
    client.execute({ sql: "SELECT 1 FROM posts WHERE category = ? LIMIT 1", args: [slug] }),
  ]);
  if (sourcesRef.rows.length > 0) throw new Error("Category is referenced by sources");
  if (postsRef.rows.length > 0) throw new Error("Category is referenced by posts");
  await client.execute({ sql: "DELETE FROM category_configs WHERE slug = ?", args: [slug] });
}

/** Get all category slugs for a source. */
export async function getSourceCategories(sourceId: string): Promise<CategorySlug[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT category_slug FROM source_categories WHERE source_id = ?",
    args: [sourceId],
  });
  return res.rows.map((r) => String(r.category_slug));
}

/** Set categories for a source (replaces existing). */
export async function setSourceCategories(sourceId: string, categories: CategorySlug[]): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = ?", args: [sourceId] });
  if (categories.length > 0) {
    const values = categories.map(() => "(?, ?)").join(", ");
    const args = categories.flatMap(c => [sourceId, c]);
    await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args });
  }
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

/**
 * Public "newsroom in numbers" snapshot for the home live graph (mockup
 * `live-analytics` parity). Mirrors GET /api/stats in the mockup: totals,
 * trend series, category distribution, activity and pipeline state — all
 * computed from real DB rows, nothing invented.
 */
export async function analyticsSnapshot(
  range: AnalyticsRange = "all",
): Promise<AnalyticsSnapshot> {
  const start = performance.now();
  const client = getClient();
  const [posts, rawPosts, commentRows, sourceRows, runRows, published] =
    await Promise.all([
      client.execute(
        "SELECT id, status, category, created_at, published_at FROM posts",
      ),
      client.execute("SELECT phash, scraped_at FROM raw_posts"),
      client.execute(
        "SELECT created_at FROM comments WHERE status = 'approved'",
      ),
      client.execute("SELECT is_active FROM sources"),
      client.execute(
        "SELECT started_at, finished_at, status FROM pipeline_runs ORDER BY started_at DESC LIMIT 500",
      ),
      client.execute(
        "SELECT id, slug, title_bn, published_at FROM posts_current_window ORDER BY published_at DESC LIMIT 6",
      ),
    ]);
  const latencyMs = Math.max(1, Math.round(performance.now() - start));

  const pt = (v: unknown) => {
    const t = Date.parse(String(v ?? ""));
    return Number.isFinite(t) ? t : 0;
  };
  const now = Date.now();
  const day = 86_400_000;

  const all: Array<Record<string, unknown>> = posts.rows as unknown as Array<Record<string, unknown>>;
  const raws: Array<Record<string, unknown>> = rawPosts.rows as unknown as Array<Record<string, unknown>>;
  const comments = commentRows.rows as unknown as Array<Record<string, unknown>>;
  const sources = sourceRows.rows as unknown as Array<Record<string, unknown>>;
  const runs = runRows.rows as unknown as Array<Record<string, unknown>>;
  const topPublished = published.rows as unknown as Array<Record<string, unknown>>;

  const collectedTimes = raws.map((r) => pt(r.scraped_at)).filter(Boolean);
  const publishedTimes = all
    .filter((p) => p.published_at && String(p.status) === "published")
    .map((p) => pt(p.published_at))
    .filter(Boolean);
  const earliest = Math.min(
    collectedTimes.length ? Math.min(...collectedTimes) : now,
    publishedTimes.length ? Math.min(...publishedTimes) : now,
  );
  const from =
    range === "24h"
      ? now - day
      : range === "7d"
        ? now - 7 * day
        : Math.min(earliest - 3_600_000, now - day);
  const bins = range === "7d" ? 7 : 12;
  const step = (now - from) / bins;
  const series = Array.from({ length: bins }, (_, i) => ({
    at: new Date(from + i * step).toISOString(),
    collected: 0,
    published: 0,
  }));
  const inside = (t: number) => t >= from && t <= now;
  const index = (t: number) =>
    Math.min(bins - 1, Math.max(0, Math.floor((t - from) / step)));

  // duplicate detection across the whole intake (a phash seen twice is a dup)
  const phashCount = new Map<string, number>();
  for (const r of raws) {
    if (r.phash) phashCount.set(String(r.phash), (phashCount.get(String(r.phash)) ?? 0) + 1);
  }
  const isDup = (r: Record<string, unknown>) =>
    !!r.phash && (phashCount.get(String(r.phash)) ?? 0) > 1;

  const totals = { collected: 0, published: 0, duplicates: 0, approvedComments: 0, pendingArticles: 0 };
  const allArticles = { published: 0, pending: 0, duplicate: 0 };
  const categoryCounts: Record<string, number> = {};

  for (const r of raws) {
    const t = pt(r.scraped_at);
    if (!inside(t)) continue;
    totals.collected++;
    const bin = series[index(t)];
    if (bin) bin.collected++;
    if (isDup(r)) totals.duplicates++;
  }
  for (const p of all) {
    const st = String(p.status);
    if (st === "published") allArticles.published++;
    else if (st === "pending_review") allArticles.pending++;
    else if (st === "duplicate") allArticles.duplicate++;
    const publishedAt = pt(p.published_at);
    if (st === "published" && inside(publishedAt)) {
      totals.published++;
      const bin = series[index(publishedAt)];
      if (bin) bin.published++;
    }
    if (st === "pending_review" && inside(pt(p.created_at))) totals.pendingArticles++;
    const key = String(p.category);
    if (st === "published" && key) {
      categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
    }
  }

  for (const c of comments) {
    const at = pt(c.created_at);
    if (inside(at)) totals.approvedComments++;
  }

  const sourceStates = { watching: 0, paused: 0, error: 0, total: sources.length };
  for (const s of sources) {
    sourceStates[String(s.is_active) === "1" ? "watching" : "paused"]++;
  }

  const r0 = runs[0] as Record<string, unknown> | undefined;
  let collectorStatus: AnalyticsSnapshot["collector"]["status"] = "not_connected";
  if (r0) {
    const st = String(r0.status);
    const finished = pt(r0.finished_at ?? r0.started_at);
    collectorStatus =
      st === "running"
        ? "working"
        : now - finished < 90_000
          ? "ready"
          : "offline";
  }

  const selected = runs
    .filter((r) => inside(pt(r.started_at)))
    .map((r) => {
      const s = pt(r.started_at);
      const f = pt(r.finished_at);
      return { durationSec: s && f ? Math.round((f - s) / 1000) : 0 };
    });
  const activities = topPublished
    .filter((p) => p.published_at)
    .map((p) => ({
      id: `a${String(p.id)}`,
      kind: "article" as const,
      text: String(p.title_bn),
      at: String(p.published_at),
      href: `/post/${String(p.slug)}`,
    }));

  const url = (process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
  const driver = /^https?:/.test(url) ? "TURSO" : url.startsWith("file:") ? "LOCAL" : "TURSO";
  const mode: "local" | "cloud" = /^https?:/.test(url) ? "cloud" : "local";

  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    range,
    from: new Date(from).toISOString(),
    to: new Date(now).toISOString(),
    database: { driver, mode, latencyMs },
    totals,
    allArticles,
    categories: Object.entries(categoryCounts).map(([key, count]) => ({ key, count })),
    series,
    sources: sourceStates,
    collector: {
      status: collectorStatus,
      lastSeenAt: r0 ? String(r0.started_at) : null,
    },
    latestPublication: topPublished[0]?.published_at ? String(topPublished[0].published_at) : null,
    activity: activities,
    runSummary: {
      count: selected.length,
      durationSec: selected.length
        ? Math.round(selected.reduce((s, r) => s + r.durationSec, 0) / selected.length)
        : null,
      lastAt: r0 ? String(r0.started_at) : null,
    },
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

/* ------------------------------------------------------------------ *
 * Reader comments + moderation queue
 * ------------------------------------------------------------------ */

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    author: String(row.author),
    body: String(row.body),
    likes: Number(row.likes ?? 0),
    status: (String(row.status ?? "pending") as CommentStatus),
    created_at: String(row.created_at),
  };
}

/** Public — only approved comments for one post, newest first. */
export async function getPostComments(postId: string): Promise<Comment[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 200",
    args: [postId],
  });
  return res.rows.map((r) => mapComment(r as Record<string, unknown>));
}

/** Admin/moderation — every comment joined with its parent post title/category. */
export async function getAllComments(limit = 400): Promise<CommentWithPost[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT c.*, p.title_bn AS postTitle, p.category AS postCategory
          FROM comments c LEFT JOIN posts p ON p.id = c.post_id
          ORDER BY c.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...mapComment(row),
      postTitle: (row.postTitle as string | null) ?? null,
      postCategory: (row.postCategory as string | null) ?? null,
    };
  });
}

/** New comment always lands in the moderation queue (status = pending). */
export async function createComment(input: {
  postId: string;
  author: string;
  body: string;
}): Promise<Comment> {
  const client = getClient();
  const id = crypto.randomUUID();
  const created = nowIso();
  await client.execute({
    sql: "INSERT INTO comments (id, post_id, author, body, likes, status, created_at) VALUES (?, ?, ?, ?, 0, 'pending', ?)",
    args: [id, input.postId, input.author.trim(), input.body.trim(), created],
  });
  return {
    id,
    post_id: input.postId,
    author: input.author.trim(),
    body: input.body.trim(),
    likes: 0,
    status: "pending",
    created_at: created,
  };
}

/** Moderation action: approve → approved, block → blocked. */
export async function setCommentStatus(
  id: string,
  status: "approved" | "blocked",
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE comments SET status = ? WHERE id = ?",
    args: [status, id],
  });
}

/** Hard-delete a comment (moderation). */
export async function deleteComment(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM comments WHERE id = ?", args: [id] });
}

/* ------------------------------------------------------------------ *
 * Bi-directional Sync (local file DB ↔ cloud Turso)
 * ------------------------------------------------------------------ */

/** Tables that participate in sync (in dependency order). */
const SYNC_TABLES = [
  "settings",
  "category_configs",
  "sources",
  "source_categories",
  "llm_providers",
  "raw_posts",
  "posts",
  "submitted_pages",
  "admin_users",
  "admin_sessions",
  "pipeline_runs",
  "removal_requests",
  "admin_actions",
  "comments",
  "redaction_blocklist",
] as const;

type SyncTable = typeof SYNC_TABLES[number];

interface SyncOptions {
  direction: "push" | "pull"; // push = local → cloud, pull = cloud → local
  tables?: SyncTable[];
  dryRun?: boolean;
}

/**
 * Perform bi-directional sync between local and cloud databases.
 * Uses INSERT OR REPLACE with timestamp-based conflict resolution.
 */
export async function syncDatabases(
  localClient: ReturnType<typeof getClient>,
  cloudClient: ReturnType<typeof getClient>,
  options: SyncOptions = { direction: "push" },
): Promise<{
  ok: true;
  synced: Record<string, { inserted: number; updated: number; deleted: number }>;
  conflicts: number;
  durationMs: number;
}> {
  const start = Date.now();
  const tables = options.tables ?? SYNC_TABLES;
  const direction = options.direction;
  const dryRun = options.dryRun ?? false;

  const results: Record<string, { inserted: number; updated: number; deleted: number }> = {};
  let totalConflicts = 0;

  // Get or create sync checkpoints
  async function getCheckpoint(table: SyncTable) {
    const res = await localClient.execute({
      sql: "SELECT last_local_max_id, last_cloud_max_id FROM sync_checkpoint WHERE table_name = ?",
      args: [table],
    });
    return res.rows[0] as Record<string, unknown> | undefined;
  }

  async function setCheckpoint(table: SyncTable, localMaxId: string | null, cloudMaxId: string | null) {
    await localClient.execute({
      sql: `INSERT OR REPLACE INTO sync_checkpoint (table_name, last_synced_at, last_local_max_id, last_cloud_max_id)
            VALUES (?, ?, ?, ?)`,
      args: [table, nowIso(), localMaxId, cloudMaxId],
    });
  }

  for (const table of tables) {
    const checkpoint = await getCheckpoint(table);
    const localMaxId = checkpoint?.last_local_max_id as string | null;
    const cloudMaxId = checkpoint?.last_cloud_max_id as string | null;

    // Determine source and target based on direction
    const src = direction === "push" ? localClient : cloudClient;
    const dst = direction === "push" ? cloudClient : localClient;
    const srcMaxId = direction === "push" ? localMaxId : cloudMaxId;

    // Fetch changes since last sync
    const changes = await src.execute({
      sql: `SELECT * FROM ${table} WHERE id > ? ORDER BY id ASC`,
      args: [srcMaxId ?? ""],
    });

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    for (const row of changes.rows) {
      const rowData = row as Record<string, unknown>;
      const id = String(rowData.id);

      // Check if exists in destination
      const existing = await dst.execute({
        sql: `SELECT updated_at FROM ${table} WHERE id = ?`,
        args: [id],
      });

      if (existing.rows.length === 0) {
        // Insert new
        if (!dryRun) {
          const cols = Object.keys(rowData).join(", ");
          const placeholders = Object.keys(rowData).map(() => "?").join(", ");
          const values = Object.values(rowData) as InValue[];
          await dst.execute({ sql: `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, args: values });
        }
        inserted++;
      } else {
        // Conflict resolution: newer updated_at wins
        const existingRow = existing.rows[0];
        const dstUpdated = existingRow ? String(existingRow.updated_at ?? "") : "";
        const srcUpdated = String(rowData.updated_at ?? "");
        
        if (srcUpdated > dstUpdated) {
          if (!dryRun) {
            const sets = Object.keys(rowData).filter(k => k !== "id").map(k => `${k} = ?`).join(", ");
            const values = Object.entries(rowData).filter(([k]) => k !== "id").map(([, v]) => v) as InValue[];
            await dst.execute({ sql: `UPDATE ${table} SET ${sets} WHERE id = ?`, args: [...values, id] });
          }
          updated++;
          totalConflicts++;
        }
        // If dst is newer, skip (dst wins)
      }
    }

    results[table] = { inserted, updated, deleted };

    // Update checkpoint
    const newMaxId = changes.rows.length > 0 
      ? String(changes.rows[changes.rows.length - 1]?.id ?? "")
      : srcMaxId;
    await setCheckpoint(table, 
      direction === "push" ? newMaxId : localMaxId!,
      direction === "push" ? cloudMaxId! : newMaxId);
  }

  // Log sync
  if (!dryRun) {
    await localClient.execute({
      sql: `INSERT INTO sync_log (id, direction, source_db, target_db, tables_synced, rows_affected, conflicts_resolved, status, started_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      args: [
        crypto.randomUUID(),
        direction,
        direction === "push" ? "local" : "cloud",
        direction === "push" ? "cloud" : "local",
        JSON.stringify(tables),
        Object.values(results).reduce((s, r) => s + r.inserted + r.updated, 0),
        totalConflicts,
        new Date(start).toISOString(),
        nowIso(),
      ],
    });
  }

  return {
    ok: true,
    synced: results,
    conflicts: totalConflicts,
    durationMs: Date.now() - start,
  };
}

/** Get sync history. */
export async function getSyncHistory(limit = 50) {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows;
}

/** Reset sync checkpoints (force full re-sync). */
export async function resetSyncCheckpoints(): Promise<void> {
  const client = getClient();
  await client.execute("DELETE FROM sync_checkpoint");
}