import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Turso (libSQL) mirror of the Postgres schema — same tables, same fields.
 * Timestamps are stored as epoch-ms integers with `{ mode: "timestamp" }`
 * so the app always receives JS Date objects, exactly like Postgres mode.
 * Activate with DB_DRIVER=turso + TURSO_DATABASE_URL / TURSO_AUTH_TOKEN.
 */

const ts = (name: string) => integer(name, { mode: "timestamp" });

export const articles = sqliteTable("articles", {
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
  status: text("status", { enum: ["published", "pending", "duplicate"] })
    .notNull()
    .default("pending"),
  collectedAt: ts("collected_at").notNull().$defaultFn(() => new Date()),
  publishedAt: ts("published_at"),
});

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  service: text("service").notNull(),
  envName: text("env_name").notNull(),
  maskedValue: text("masked_value").notNull(),
  revealValue: text("reveal_value").notNull(),
  scope: text("scope", { enum: ["desktop", "web", "both"] })
    .notNull()
    .default("both"),
  status: text("status").notNull().default("active"),
  rotatedAt: text("rotated_at").notNull().default(""),
  note: text("note").notNull().default(""),
});

export const pipelineRuns = sqliteTable("pipeline_runs", {
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

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["page", "group"] }).notNull().default("page"),
  fbId: text("fb_id").notNull(),
  handle: text("handle").notNull().default(""),
  topics: text("topics").notNull().default(""),
  lastChecked: ts("last_checked"),
  lastPostAt: ts("last_post_at"),
  status: text("status", { enum: ["watching", "paused", "error"] })
    .notNull()
    .default("watching"),
  postsToday: integer("posts_today").notNull().default(0),
  health: integer("health").notNull().default(100),
  note: text("note").notNull().default(""),
});

export const collectorLogs = sqliteTable("collector_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: ts("ts").notNull().$defaultFn(() => new Date()),
  level: text("level", { enum: ["info", "ok", "warn", "err"] })
    .notNull()
    .default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  likes: integer("likes").notNull().default(0),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});
