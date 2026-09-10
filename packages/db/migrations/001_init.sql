-- ============================================================
-- হৈচৈ (Hoichoi) — Turso / libSQL schema, v1
-- Ported 1:1 from the Postgres design in coding-agent-prompt.md
-- Timestamps are ISO-8601 TEXT; booleans are INTEGER 0/1 0.12
-- ============================================================

-- 1) Sources: Facebook Pages we are allowed to scrape
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  page_url TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('child-sexual-abuse','extramarital-crime','missing-children')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_scraped_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources (is_active, category);

-- 2) Raw scraped posts (pre-dedup, pre-rewrite)
CREATE TABLE IF NOT EXISTS raw_posts (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id) ON DELETE CASCADE,
  fb_post_id TEXT NOT NULL,
  fb_post_url TEXT NOT NULL,
  raw_text TEXT,
  media_urls TEXT NOT NULL DEFAULT '[]',
  screenshot_path TEXT,
  phash TEXT,
  scraped_at TEXT NOT NULL,
  raw_meta TEXT,
  UNIQUE (source_id, fb_post_id)
);
CREATE INDEX IF NOT EXISTS idx_raw_posts_phash ON raw_posts (phash);
CREATE INDEX IF NOT EXISTS idx_raw_posts_source ON raw_posts (source_id);

-- 3) Rewritten posts (publishable)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  raw_post_id TEXT REFERENCES raw_posts(id) ON DELETE SET NULL,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('child-sexual-abuse','extramarital-crime','missing-children')),
  title_bn TEXT NOT NULL,
  body_bn TEXT NOT NULL,
  summary_bn TEXT,
  media_path TEXT,
  media_kind TEXT NOT NULL DEFAULT 'none' CHECK (media_kind IN ('image','video','none')),
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','published','removed')),
  safety_flags TEXT NOT NULL DEFAULT '[]',
  embedding TEXT,
  case_status TEXT CHECK (case_status IN ('active','found','unresolved','false-alarm','unknown')),
  case_updated_at TEXT,
  original_author_name TEXT,
  original_author_url TEXT,
  published_at TEXT,
  archived_at TEXT,
  archive_reason TEXT CHECK (archive_reason IN ('auto_rollover','manual','retention_purge')),
  legal_hold INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_window ON posts (status, archived_at, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category, status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);

-- Vector table (posts_vec) lives in 002_vec.sql — the local `file:` libsql build
-- does not ship the vec0 module, while Turso does. The dedup layer has a pure-JS
-- cosine fallback so local `file:` databases always work without it.

-- 4) Submitted pages (public form inserts here)
CREATE TABLE IF NOT EXISTS submitted_pages (
  id TEXT PRIMARY KEY,
  page_url TEXT NOT NULL,
  page_name TEXT,
  submitter_email TEXT,
  submitter_name TEXT,
  category TEXT CHECK (category IN ('child-sexual-abuse','extramarital-crime','missing-children')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','accepted','rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submitted_status ON submitted_pages (status, created_at);

-- 5) LLM provider configurations (metadata only — KEYS LIVE IN STRONGHOLD / ENV)
CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL CHECK (provider_key IN ('google','groq','openrouter','ollama','anthropic','openai','mistral','custom')),
  display_name TEXT NOT NULL,
  base_url TEXT,
  model_name TEXT NOT NULL,
  api_key_env_var TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_free_tier INTEGER NOT NULL DEFAULT 0,
  supports_rewrite INTEGER NOT NULL DEFAULT 1,
  supports_embeddings INTEGER NOT NULL DEFAULT 0,
  rate_limit_rpm INTEGER,
  config TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_providers_active ON llm_providers (is_active, priority);

-- 6) Admin users + sessions (self-contained auth; Turso has no auth built in)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','moderator')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON admin_sessions (user_id);

-- 7) Pipeline run logs
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  stats TEXT,
  provider_used TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_started ON pipeline_runs (started_at);

-- 8) Moderation / removal requests (public users can submit)
CREATE TABLE IF NOT EXISTS removal_requests (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned')),
  created_at TEXT NOT NULL
);

-- 9) Admin action audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at);

-- 10) Category configs — drives per-category behavior
CREATE TABLE IF NOT EXISTS category_configs (
  slug TEXT PRIMARY KEY,
  display_name_bn TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  description_bn TEXT,
  description_en TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 11) Redaction blocklist (admin-editable)
CREATE TABLE IF NOT EXISTS redaction_blocklist (
  value TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'name',
  created_at TEXT NOT NULL
);

-- 12) Site settings (single row, id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pipeline_hours INTEGER NOT NULL DEFAULT 2,
  site_name TEXT NOT NULL DEFAULT 'হৈচৈ',
  contact_email TEXT,
  police_helpline TEXT NOT NULL DEFAULT '999',
  child_helpline TEXT NOT NULL DEFAULT '109',
  archive_visible_days INTEGER NOT NULL DEFAULT 7,
  archive_retention_days INTEGER NOT NULL DEFAULT 30,
  slogan_bn TEXT NOT NULL DEFAULT 'ভাইরাল বাংলা, সপ্তাহখানেক',
  tagline TEXT NOT NULL DEFAULT 'ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব',
  logo_url TEXT,
  favicon_url TEXT,
  accent_color TEXT NOT NULL DEFAULT '#d64541',
  ad_leaderboard_html TEXT,
  ad_rect_html TEXT,
  ad_infeed_html TEXT,
  ad_strip_html TEXT,
  updated_at TEXT NOT NULL
);

-- ============================================================
-- Public "current window" view — exactly the rolling 7-day window
-- (status = published, not archived, published within window,
--  active missing-children cases always included)
-- ============================================================
DROP VIEW IF EXISTS posts_current_window;
CREATE VIEW posts_current_window AS
SELECT
  p.*,
  (strftime('%s', datetime(p.published_at)) + (s.archive_visible_days * 86400) - strftime('%s', 'now')) * 1000 AS ttl_ms
FROM posts p
CROSS JOIN settings s
WHERE p.status = 'published'
  AND p.archived_at IS NULL
  AND (
    p.category = 'missing-children' AND p.case_status = 'active'
    OR
    strftime('%s', p.published_at) >= strftime('%s', 'now') - s.archive_visible_days * 86400
  );
-- ============================================================
-- Reader comments (added for comments-moderation feature)
-- Every new comment lands in the moderation queue (status = pending)
-- and only approved comments are shown on the public post page.
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','blocked')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
