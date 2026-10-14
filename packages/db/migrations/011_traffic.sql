-- 011: first-party, cookie-less traffic telemetry (admin analytics groups).
-- page_views = one row per tracked page view; ad_events = ad slot view/click.
-- No raw IP is stored: the tracking route hashes IP+UA+day into visitor_id.

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  post_id TEXT,
  post_slug TEXT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  os TEXT,
  browser TEXT,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views (post_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views (session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id);

CREATE TABLE IF NOT EXISTS ad_events (
  id TEXT PRIMARY KEY,
  slot TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'view' CHECK (event IN ('view','click')),
  post_id TEXT,
  path TEXT,
  session_id TEXT,
  visitor_id TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events (created_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_slot ON ad_events (slot);
CREATE INDEX IF NOT EXISTS idx_ad_events_post ON ad_events (post_id);
