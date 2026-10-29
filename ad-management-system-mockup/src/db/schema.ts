import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Advertisers (client portal accounts)                                */
/* ------------------------------------------------------------------ */
export const advertisers = pgTable("advertisers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  company: varchar("company", { length: 160 }),
  email: varchar("email", { length: 190 }).notNull().unique(),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  /** admin | client */
  role: varchar("role", { length: 20 }).notNull().default("client"),
  lang: varchar("lang", { length: 5 }).notNull().default("bn"),
  /** approved | pending | blocked */
  status: varchar("status", { length: 20 }).notNull().default("approved"),
  creditBdt: integer("credit_bdt").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Campaigns — a client groups bookings under a campaign               */
/* ------------------------------------------------------------------ */
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id")
    .notNull()
    .references(() => advertisers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  objective: varchar("objective", { length: 40 }).notNull().default("awareness"),
  landingUrl: varchar("landing_url", { length: 400 }),
  budgetBdt: integer("budget_bdt").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Creatives — a template id + customised data + translations          */
/* ------------------------------------------------------------------ */
export const creatives = pgTable("creatives", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id")
    .notNull()
    .references(() => advertisers.id, { onDelete: "cascade" }),
  templateId: varchar("template_id", { length: 24 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  palette: varchar("palette", { length: 24 }).notNull().default("newsprint"),
  /** CreativeData */
  data: jsonb("data").notNull().default({}),
  /** CreativeStyle — fonts, colours, image filters, animation */
  style: jsonb("style").notNull().default({}),
  /** BlockLayout — drag-and-drop structure; when present it wins over `kind` */
  layout: jsonb("layout").notNull().default({}),
  /** { en: CreativeData, hi: CreativeData ... } produced by auto-translate */
  i18n: jsonb("i18n").notNull().default({}),
  baseLang: varchar("base_lang", { length: 5 }).notNull().default("bn"),
  autoTranslate: boolean("auto_translate").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Bookings — one creative occupying one slot for a date range         */
/* ------------------------------------------------------------------ */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    ref: varchar("ref", { length: 24 }).notNull().unique(),
    advertiserId: integer("advertiser_id")
      .notNull()
      .references(() => advertisers.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    creativeId: integer("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    slotKey: varchar("slot_key", { length: 48 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    days: integer("days").notNull().default(1),
    /** draft | pending_payment | in_review | scheduled | active | paused | expired | rejected */
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    priority: integer("priority").notNull().default(0),
    grossBdt: integer("gross_bdt").notNull().default(0),
    discountBdt: integer("discount_bdt").notNull().default(0),
    vatBdt: integer("vat_bdt").notNull().default(0),
    totalBdt: integer("total_bdt").notNull().default(0),
    /** true when admin created/edited it by hand */
    manual: boolean("manual").notNull().default(false),
    adminNote: text("admin_note"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("bookings_slot_idx").on(t.slotKey, t.status)]
);

/* ------------------------------------------------------------------ */
/* Payments                                                             */
/* ------------------------------------------------------------------ */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),
  advertiserId: integer("advertiser_id")
    .notNull()
    .references(() => advertisers.id, { onDelete: "cascade" }),
  /** bkash | nagad | rocket | card | paypal | crypto | bank | manual */
  method: varchar("method", { length: 20 }).notNull(),
  amountBdt: integer("amount_bdt").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  /** initiated | paid | failed | refunded */
  status: varchar("status", { length: 20 }).notNull().default("initiated"),
  trxId: varchar("trx_id", { length: 80 }),
  payerRef: varchar("payer_ref", { length: 120 }),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Slot overrides — admin can disable / reprice a slot without code     */
/* ------------------------------------------------------------------ */
export const slotConfig = pgTable("slot_config", {
  slotKey: varchar("slot_key", { length: 48 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  dayRateBdt: integer("day_rate_bdt"),
  houseHtmlEnabled: boolean("house_html_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Delivery events                                                      */
/* ------------------------------------------------------------------ */
export const adEvents = pgTable("ad_events", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),
  slotKey: varchar("slot_key", { length: 48 }).notNull(),
  /** impression | click */
  kind: varchar("kind", { length: 12 }).notNull(),
  path: varchar("path", { length: 300 }),
  device: varchar("device", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Activity log — every automatic + manual action for the audit trail   */
/* ------------------------------------------------------------------ */
export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  actor: varchar("actor", { length: 60 }).notNull().default("system"),
  action: varchar("action", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 120 }),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Saved custom templates — any template can be re-composed and kept    */
/* ------------------------------------------------------------------ */
export const customTemplates = pgTable("custom_templates", {
  id: serial("id").primaryKey(),
  /** null = shared house template available to every advertiser */
  advertiserId: integer("advertiser_id").references(() => advertisers.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 160 }).notNull(),
  sourceTemplateId: varchar("source_template_id", { length: 24 }),
  palette: varchar("palette", { length: 24 }).notNull().default("newsprint"),
  layout: jsonb("layout").notNull().default({}),
  style: jsonb("style").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
