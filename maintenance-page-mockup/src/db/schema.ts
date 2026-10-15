import {
  boolean,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SiteSettings } from "@/lib/types";

/** Single-row style store: the whole maintenance page configuration as JSON. */
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  data: jsonb("data").$type<SiteSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Newsletter sign-ups captured from the visitor page. */
export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    theme: text("theme"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscribers_email_idx").on(t.email)],
);

/** Contact messages submitted through the maintenance page. */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Lightweight analytics events for the visitor page. */
export const visits = pgTable(
  "visits",
  {
    id: serial("id").primaryKey(),
    day: text("day").notNull(),
    theme: text("theme").notNull(),
    path: text("path").notNull(),
    device: text("device"),
    country: text("country"),
    referrer: text("referrer"),
    subscribed: boolean("subscribed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visits_day_idx").on(t.day), index("visits_theme_idx").on(t.theme)],
);

export type Subscriber = typeof subscribers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Visit = typeof visits.$inferSelect;
