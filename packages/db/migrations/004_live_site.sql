-- ============================================================
-- হৈচৈ — Live-site reader engagement + provider keys
-- Migration 004:
--   • reader_reports table (public report form → admin queue)
--   • comments.email  (added idempotently by the app layer — SQLite
--     has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
--   • llm_providers.api_key (optional admin-entered override — same
--     rule, added idempotently by client.ts ensure helpers)
-- ============================================================

-- Reader reports — mirrors removal_requests but carries the reason/detail
-- fields the public report form collects (mockup: hoichoi_reports).
CREATE TABLE IF NOT EXISTS reader_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reader_reports_status ON reader_reports (status, created_at);
CREATE INDEX IF NOT EXISTS idx_reader_reports_post ON reader_reports (post_id);