import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * Namespaced `hoichoi_*` tables (see src/db/schema.ts).
 *
 * Why namespacing matters: if the configured Turso database already contains
 * tables from another application (e.g. an existing `comments` or `sources`
 * table with different columns), `CREATE TABLE IF NOT EXISTS` would silently
 * skip creation and every later query would fail. Our own prefix guarantees a
 * clean, non-destructive coexistence — we never alter or drop foreign tables.
 *
 * Timestamps use `mode: "timestamp_ms"` (epoch milliseconds).
 */
const P = "hoichoi_";
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

export const articles = sqliteTable(`${P}articles`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  dek: text("dek").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull().default("ঢাকা"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull().default("#"),
  fbExcerpt: text("fb_excerpt").notNull(),
  fbAuthor: text("fb_author").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  imageCredit: text("image_credit").notNull().default(""),
  hash: text("hash").notNull().unique(),
  readingMinutes: integer("reading_minutes").notNull().default(3),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["published", "pending", "duplicate"] }).notNull().default("pending"),
  collectedAt: ts("collected_at").notNull().$defaultFn(() => new Date()),
  publishedAt: ts("published_at"),
});

export const apiKeys = sqliteTable(`${P}api_keys`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  service: text("service").notNull(),
  envName: text("env_name").notNull(),
  maskedValue: text("masked_value").notNull(),
  revealValue: text("reveal_value").notNull(),
  scope: text("scope", { enum: ["desktop", "web", "both"] }).notNull().default("both"),
  status: text("status").notNull().default("active"),
  rotatedAt: text("rotated_at").notNull().default(""),
  note: text("note").notNull().default(""),
});

export const pipelineRuns = sqliteTable(`${P}pipeline_runs`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: ts("started_at").notNull().$defaultFn(() => new Date()),
  trigger: text("trigger").notNull().default("cron"),
  status: text("status").notNull().default("success"),
  collected: integer("collected").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  published: integer("published").notNull().default(0),
  durationSec: integer("duration_sec").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const sources = sqliteTable(`${P}sources`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["page", "group"] }).notNull().default("page"),
  fbId: text("fb_id").notNull(),
  handle: text("handle").notNull().default(""),
  topics: text("topics").notNull().default(""),
  lastChecked: ts("last_checked"),
  lastPostAt: ts("last_post_at"),
  status: text("status", { enum: ["watching", "paused", "error"] }).notNull().default("watching"),
  postsToday: integer("posts_today").notNull().default(0),
  health: integer("health").notNull().default(100),
  note: text("note").notNull().default(""),
});

export const collectorLogs = sqliteTable(`${P}collector_logs`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: ts("ts").notNull().$defaultFn(() => new Date()),
  level: text("level", { enum: ["info", "ok", "warn", "err"] }).notNull().default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
});

export const comments = sqliteTable(`${P}comments`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  email: text("email").notNull().default(""),
  body: text("body").notNull(),
  likes: integer("likes").notNull().default(0),
  status: text("status", { enum: ["pending", "approved", "rejected", "spam"] }).notNull().default("pending"),
  moderatorNote: text("moderator_note").notNull().default(""),
  reviewedAt: ts("reviewed_at"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const reports = sqliteTable(`${P}reports`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  reporterName: text("reporter_name").notNull(),
  reporterEmail: text("reporter_email").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status", { enum: ["open", "reviewed", "dismissed"] }).notNull().default("open"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const moderationActions = sqliteTable(`${P}moderation_actions`, {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("admin"),
  origin: text("origin").notNull().default("web"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const serviceHeartbeats = sqliteTable(`${P}service_heartbeats`, {
  service: text("service").primaryKey(),
  state: text("state", { enum: ["ready", "working", "error"] }).notNull().default("ready"),
  lastSeenAt: ts("last_seen_at").notNull().$defaultFn(() => new Date()),
});
