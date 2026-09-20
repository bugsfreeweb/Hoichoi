import { pgTable, pgEnum, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * All objects are namespaced with `hoichoi_` so this app can share a database
 * with other applications. A pre-existing `comments` / `sources` /
 * `pipeline_runs` table belonging to another schema will NOT be adopted or
 * altered — we create our own namespaced tables instead.
 */
const P = "hoichoi_";

export const articleStatus = pgEnum(`${P}article_status`, ["published", "pending", "duplicate"]);
export const keyScope = pgEnum(`${P}key_scope`, ["desktop", "web", "both"]);
export const sourceKind = pgEnum(`${P}source_kind`, ["page", "group"]);
export const sourceStatus = pgEnum(`${P}source_status`, ["watching", "paused", "error"]);
export const logLevel = pgEnum(`${P}log_level`, ["info", "ok", "warn", "err"]);

export const articles = pgTable(`${P}articles`, {
  id: serial("id").primaryKey(),
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
  featured: boolean("featured").notNull().default(false),
  status: articleStatus("status").notNull().default("pending"),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const apiKeys = pgTable(`${P}api_keys`, {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  service: text("service").notNull(),
  envName: text("env_name").notNull(),
  maskedValue: text("masked_value").notNull(),
  revealValue: text("reveal_value").notNull(),
  scope: keyScope("scope").notNull().default("both"),
  status: text("status").notNull().default("active"),
  rotatedAt: text("rotated_at").notNull().default(""),
  note: text("note").notNull().default(""),
});

export const pipelineRuns = pgTable(`${P}pipeline_runs`, {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  trigger: text("trigger").notNull().default("cron"),
  status: text("status").notNull().default("success"),
  collected: integer("collected").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  published: integer("published").notNull().default(0),
  durationSec: integer("duration_sec").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const sources = pgTable(`${P}sources`, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: sourceKind("kind").notNull().default("page"),
  fbId: text("fb_id").notNull(),
  handle: text("handle").notNull().default(""),
  topics: text("topics").notNull().default(""),
  lastChecked: timestamp("last_checked", { withTimezone: true }),
  lastPostAt: timestamp("last_post_at", { withTimezone: true }),
  status: sourceStatus("status").notNull().default("watching"),
  postsToday: integer("posts_today").notNull().default(0),
  health: integer("health").notNull().default(100),
  note: text("note").notNull().default(""),
});

export const collectorLogs = pgTable(`${P}collector_logs`, {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  level: logLevel("level").notNull().default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
});

export const comments = pgTable(`${P}comments`, {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  email: text("email").notNull().default(""),
  body: text("body").notNull(),
  likes: integer("likes").notNull().default(0),
  status: text("status", { enum: ["pending", "approved", "rejected", "spam"] }).notNull().default("pending"),
  moderatorNote: text("moderator_note").notNull().default(""),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable(`${P}reports`, {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  reporterName: text("reporter_name").notNull(),
  reporterEmail: text("reporter_email").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status", { enum: ["open", "reviewed", "dismissed"] }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moderationActions = pgTable(`${P}moderation_actions`, {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default("admin"),
  origin: text("origin").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceHeartbeats = pgTable(`${P}service_heartbeats`, {
  service: text("service").primaryKey(),
  state: text("state", { enum: ["ready", "working", "error"] }).notNull().default("ready"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});
