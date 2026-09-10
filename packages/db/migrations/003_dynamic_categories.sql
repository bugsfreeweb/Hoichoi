-- ============================================================
-- হৈচৈ — Dynamic categories + multi-category sources
-- Migration 003: removes fixed CHECK constraints, adds category_configs as source of truth
-- ============================================================

-- 1) New table for dynamic category management (already exists in 001 but now authoritative)
-- category_configs already created in 001_init.sql lines 163-174
-- It has: slug (PK), display_name_bn/en, description_bn/en, is_active, sort_order, config (JSON), timestamps

-- 2) Junction table for source <-> categories (many-to-many)
CREATE TABLE IF NOT EXISTS source_categories (
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES category_configs(slug) ON DELETE CASCADE,
  PRIMARY KEY (source_id, category_slug)
);
CREATE INDEX IF NOT EXISTS idx_source_categories_source ON source_categories (source_id);
CREATE INDEX IF NOT EXISTS idx_source_categories_category ON source_categories (category_slug);

-- 3) Migrate existing single-category sources to junction table
INSERT OR IGNORE INTO source_categories (source_id, category_slug)
SELECT id, category FROM sources WHERE category IS NOT NULL;

-- 4) Make sources.category nullable (will keep for backward compat but junction is authoritative)
-- SQLite doesn't support DROP COLUMN directly, so we'll add a new column and migrate
-- For now, keep sources.category as-is for backward compatibility
-- New code should use source_categories table

-- 5) Posts table: category should reference category_configs (but keep CHECK for now with dynamic values)
-- We'll handle this in application layer - category_configs is the source of truth

-- 6) Seed default categories (idempotent)
INSERT OR IGNORE INTO category_configs (slug, display_name_bn, display_name_en, description_bn, description_en, is_active, sort_order, config, created_at, updated_at) VALUES
('child-sexual-abuse', 'শিশু যৌন শোষণ', 'Child Sexual Abuse', 'শিশু যৌন শোষণ সংক্রান্ত সংবাদ ও খবর', 'News related to child sexual abuse', 1, 1, '{"requires_double_approval":true,"show_content_warning":true,"content_warning_text_bn":"এই বিষয়বস্তু শিশু যৌন শোষণ সংক্রান্ত। পাঠকরা সতর্ক থাকবেন।","auto_pending_review":true,"redaction_strict":"maximum","allow_identifying_details":false,"publish_age_gate":true,"use_allegation_language":true,"supports_case_status":true,"share_widely_cta":true,"include_helpline_numbers":true}', datetime('now'), datetime('now')),
('extramarital-crime', 'বিবাহিত জীবনে অপরাধ', 'Extramarital Crime', 'বিবাহিত জীবন ও অপরাধ সংক্রান্ত সংবাদ', 'News related to crimes in marital life', 1, 2, '{"requires_double_approval":true,"show_content_warning":true,"content_warning_text_bn":"এই বিষয়বস্তু সংবেদনশীল পারিবারিক বিষয় রয়েছে।","auto_pending_review":true,"redaction_strict":"standard","allow_identifying_details":false,"publish_age_gate":false,"use_allegation_language":true,"supports_case_status":true,"share_widely_cta":false,"include_helpline_numbers":true}', datetime('now'), datetime('now')),
('missing-children', 'নিখোঁজ শিশু', 'Missing Children', 'নিখোঁজ শিশু খুঁজে পাওয়ার সংবাদ ও আপডেট', 'Missing children alerts and updates', 1, 3, '{"requires_double_approval":false,"show_content_warning":false,"auto_pending_review":false,"redaction_strict":"child_minimal","allow_identifying_details":true,"publish_age_gate":false,"use_allegation_language":false,"supports_case_status":true,"share_widely_cta":true,"include_helpline_numbers":true}', datetime('now'), datetime('now'));

-- 7) Add sync metadata tables for bi-directional sync tracking
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('push','pull')),
  source_db TEXT NOT NULL, -- 'local' or 'cloud'
  target_db TEXT NOT NULL,
  tables_synced TEXT NOT NULL, -- JSON array of table names
  rows_affected INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('started','completed','failed')),
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log (started_at);

CREATE TABLE IF NOT EXISTS sync_checkpoint (
  table_name TEXT PRIMARY KEY,
  last_synced_at TEXT NOT NULL,
  last_local_max_id TEXT, -- for conflict detection
  last_cloud_max_id TEXT
);

-- 8) Add sync_version to settings for version tracking
-- (settings table already exists, we just ensure it has the right columns)

-- 9) Add moderation queue enhancements
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_by TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderated_at TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- 10) Add ad slot configuration tracking
-- (settings table already has ad_*_html columns)

-- ============================================================
-- View for posts with their categories (via category_configs)
-- ============================================================
DROP VIEW IF EXISTS posts_with_categories;
CREATE VIEW posts_with_categories AS
SELECT
  p.*,
  cc.display_name_bn AS category_display_bn,
  cc.display_name_en AS category_display_en,
  cc.dot AS category_dot,
  cc.config AS category_config
FROM posts p
LEFT JOIN category_configs cc ON cc.slug = p.category;

-- ============================================================
-- View for sources with their categories
-- ============================================================
DROP VIEW IF EXISTS sources_with_categories;
CREATE VIEW sources_with_categories AS
SELECT
  s.*,
  GROUP_CONCAT(sc.category_slug) AS category_slugs,
  GROUP_CONCAT(cc.display_name_bn, ' | ') AS category_names_bn
FROM sources s
LEFT JOIN source_categories sc ON sc.source_id = s.id
LEFT JOIN category_configs cc ON cc.slug = sc.category_slug
GROUP BY s.id;