-- Credential expiry tracking.
--
-- Provider keys, GitHub tokens, storage keys and mail keys all die on a date.
-- Until now that date lived only in someone's head: the pipeline would simply
-- start failing and the first signal was a red run. These columns give the
-- console something to warn about, seven days ahead.
--
-- `credentials` covers secrets the server cannot read (they live in the desktop
-- vault or in Vercel env): the operator registers the name and the expiry, and
-- the daily job warns. Nothing secret is stored here — only a label.

ALTER TABLE llm_providers ADD COLUMN api_key_expires_at TEXT;

CREATE TABLE IF NOT EXISTS credentials (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,               -- "GitHub PAT (pipeline dispatch)"
  scope           TEXT NOT NULL DEFAULT 'other', -- provider | storage | mail | vcs | infra | other
  owner_email     TEXT,                        -- who should be warned, defaults to secrets contact
  expires_at      TEXT NOT NULL,               -- ISO date/time; the thing being tracked
  warn_days       INTEGER NOT NULL DEFAULT 7,
  notes           TEXT,
  last_notified_at TEXT,                       -- set by the cron job; one mail per day per row
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credentials_expiry ON credentials(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_name ON credentials(name);
