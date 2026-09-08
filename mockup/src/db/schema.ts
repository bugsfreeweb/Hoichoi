import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const articleStatus = pgEnum("article_status", [
  "published",
  "pending",
  "duplicate",
]);

export const keyScope = pgEnum("key_scope", ["desktop", "web", "both"]);

export const sourceKind = pgEnum("source_kind", ["page", "group"]);

export const sourceStatus = pgEnum("source_status", [
  "watching",
  "paused",
  "error",
]);

export const logLevel = pgEnum("log_level", ["info", "ok", "warn", "err"]);

export const commentStatus = pgEnum("comment_status", [
  "approved",
  "pending",
  "blocked",
]);

export const banScope = pgEnum("ban_scope", ["7d", "30d", "permanent"]);

/**
 * Articles collected from monitored Facebook sources, screenshot-archived,
 * de-duplicated by hash, then rewritten into publish-ready Bangla stories.
 */
export const articles = pgTable("articles", {
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
  collectedAt: timestamp("collected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

/** Encrypted API vault entries surfaced on the admin panel. */
export const apiKeys = pgTable("api_keys", {
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

/** Automation log — one row per 2-hour collector run. */
export const pipelineRuns = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  trigger: text("trigger").notNull().default("cron"),
  status: text("status").notNull().default("success"),
  collected: integer("collected").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  published: integer("published").notNull().default(0),
  durationSec: integer("duration_sec").notNull().default(0),
  note: text("note").notNull().default(""),
});

/** Facebook pages/groups the Tauri desk watches. */
export const sources = pgTable("sources", {
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

/** Streaming collector log lines shown in the desktop app. */
export const collectorLogs = pgTable("collector_logs", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  level: logLevel("level").notNull().default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
});

/** Public reader comments on published articles. */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  likes: integer("likes").notNull().default(0),
  // moderation
  status: commentStatus("status").notNull().default("approved"),
  ip: text("ip").notNull().default(""),
  flagged: text("flagged").notNull().default(""), // matched banned words, comma-joined
  autoModerated: boolean("auto_moderated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Auto/manual IP bans issued by the moderation engine. */
export const ipBans = pgTable("ip_bans", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  scope: banScope("scope").notNull().default("7d"),
  reason: text("reason").notNull().default(""),
  strikes: integer("strikes").notNull().default(1),
  auto: boolean("auto").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = permanent
});

/** Moderation dictionary — offensive terms that trigger auto-block. */
export const bannedWords = pgTable("banned_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  severity: integer("severity").notNull().default(1), // 1 soft .. 3 hard
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
