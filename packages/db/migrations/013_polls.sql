-- 013_polls.sql
-- Standalone topic-based polls (independent of live events) shown on /poll.

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'bar',
  status TEXT NOT NULL DEFAULT 'open',
  featured INTEGER NOT NULL DEFAULT 0,
  topic_color TEXT NOT NULL DEFAULT '#d2202c',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id INTEGER NOT NULL,
  option_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (poll_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_featured ON polls (featured, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);