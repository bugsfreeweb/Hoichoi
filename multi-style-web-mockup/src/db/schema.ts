import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Every renderable block on the site is a "section".
 * Sections belong to a scope (home / post) and a zone (header, hero, main, major, footer).
 * Each section exposes N design variants; the admin panel picks one and can hide it.
 */
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  scope: varchar("scope", { length: 16 }).notNull(), // 'home' | 'post'
  zone: varchar("zone", { length: 24 }).notNull(), // header | hero | main | major | footer
  label: text().notNull(),
  labelEn: text().notNull(),
  description: text().notNull().default(""),
  variant: varchar("variant", { length: 48 }).notNull(),
  visible: boolean("visible").notNull().default(true),
  position: integer("position").notNull().default(0),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row table holding brand + global presentation settings. */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  brand: jsonb("brand").$type<Record<string, unknown>>().notNull().default({}),
  motion: boolean("motion").notNull().default(true),
  density: varchar("density", { length: 16 }).notNull().default("comfortable"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postSlug: varchar("post_slug", { length: 180 }).notNull(),
  author: varchar("author", { length: 80 }).notNull(),
  body: text().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postReports = pgTable("post_reports", {
  id: serial("id").primaryKey(),
  postSlug: varchar("post_slug", { length: 180 }).notNull(),
  reporter: varchar("reporter", { length: 80 }).notNull().default("পাঠক"),
  reason: varchar("reason", { length: 40 }).notNull(),
  details: text().notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  source: varchar("source", { length: 40 }).notNull().default("site"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  hash: varchar("hash", { length: 16 }).notNull().default(""),
  title: text().notNull(),
  titleEn: text().notNull().default(""),
  dek: text().notNull().default(""),
  rawFeed: text().notNull().default(""),
  category: varchar("category", { length: 64 }).notNull(),
  categorySlug: varchar("category_slug", { length: 64 }).notNull(),
  source: varchar("source", { length: 120 }).notNull().default(""),
  sourceUrl: text().notNull().default(""),
  author: varchar("author", { length: 120 }).notNull().default(""),
  location: varchar("location", { length: 120 }).notNull().default(""),
  image: text().notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  body: jsonb("body").$type<Array<Record<string, unknown>>>().notNull().default([]),
  keyPoints: jsonb("key_points").$type<string[]>().notNull().default([]),
  timeline: jsonb("timeline").$type<Array<Record<string, unknown>>>().notNull().default([]),
  facts: jsonb("facts").$type<Array<Record<string, unknown>>>().notNull().default([]),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
  factScore: integer("fact_score").notNull().default(88),
  views: integer("views").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  readMinutes: integer("read_minutes").notNull().default(2),
  featured: boolean("featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Section = typeof sections.$inferSelect;
export type Post = typeof posts.$inferSelect;
