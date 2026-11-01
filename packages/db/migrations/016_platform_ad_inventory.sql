-- First-party ad placements are separate from the legacy HTML/ad-network code.
CREATE TABLE IF NOT EXISTS platform_ad_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'click')),
  path TEXT,
  device TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_ad_events_booking_date
  ON platform_ad_events (booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_platform_ad_events_slot_date
  ON platform_ad_events (slot_key, created_at);

INSERT OR IGNORE INTO ad_slots
  (slot_key, name, description, enabled, day_rate_bdt, house_html_enabled, updated_at)
VALUES
  ('home_leaderboard', 'হোমপেজ ব্যানার', 'হোমপেজের প্রধান কনটেন্টের আগে platform-sponsored banner.', 1, 3000, 0, datetime('now')),
  ('home_strip', 'হোমপেজ স্ট্রিপ', 'হোমপেজের কনটেন্ট ফিডে platform-sponsored strip.', 1, 1800, 0, datetime('now')),
  ('article_leaderboard', 'আর্টিকেল ব্যানার', 'আর্টিকেল কনটেন্টের আগে platform-sponsored banner.', 1, 2500, 0, datetime('now')),
  ('article_rect', 'আর্টিকেল সাইডকার্ড', 'আর্টিকেল পৃষ্ঠার অতিরিক্ত platform-sponsored card.', 1, 1500, 0, datetime('now'));
