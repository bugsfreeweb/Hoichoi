-- 008_notices.sql
-- Announcements / notifications shown to web visitors (notifications bell +
-- pinned public "special notice" banner). Mirrors ensureNoticesTable in
-- packages/db/src/client.ts so the table always exists on fresh installs too.

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  tone TEXT NOT NULL DEFAULT 'info',
  url TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'web',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notices_active ON notices (is_active, pinned, updated_at DESC);