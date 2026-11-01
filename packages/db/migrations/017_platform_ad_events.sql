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
