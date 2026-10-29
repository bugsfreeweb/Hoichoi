-- 014_ads.sql
-- Ad management system: slots, creatives, bookings, events, clients

CREATE TABLE IF NOT EXISTS ad_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'approved',
  credit_bdt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_creatives (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'leaderboard',
  palette TEXT NOT NULL DEFAULT 'newsprint',
  data_json TEXT NOT NULL DEFAULT '{}',
  style_json TEXT NOT NULL DEFAULT '{}',
  layout_json TEXT NOT NULL DEFAULT '{}',
  base_lang TEXT NOT NULL DEFAULT 'bn',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_slots (
  slot_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  day_rate_bdt INTEGER NOT NULL DEFAULT 1000,
  house_html_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_bookings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 0,
  gross_bdt INTEGER NOT NULL DEFAULT 0,
  discount_bdt INTEGER NOT NULL DEFAULT 0,
  vat_bdt INTEGER NOT NULL DEFAULT 0,
  total_bdt INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  slot_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT,
  device TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'awareness',
  landing_url TEXT,
  budget_bdt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_slot_config (
  slot_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  day_rate_bdt INTEGER,
  house_html_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_events_slot ON ad_events (slot_key, kind);
CREATE INDEX IF NOT EXISTS idx_ad_bookings_slot ON ad_bookings (slot_key, status);
CREATE INDEX IF NOT EXISTS idx_ad_bookings_client ON ad_bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_client ON ad_creatives (client_id);