-- 030: admin notifications.
--
-- The bell only ever showed queue *counts*, so anything that was not a queue
-- (a provider on cooldown, a credential about to expire, a reconciliation that
-- deleted files, a cron that failed closed) existed only in a log nobody reads.
--
-- One row per thing that happened that an operator should know about.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,                 -- provider | credential | media | cron | security | pipeline
  severity      TEXT NOT NULL DEFAULT 'info',  -- info | warn | critical
  title_bn      TEXT NOT NULL,
  body_bn       TEXT,
  href          TEXT,                          -- where to act, e.g. /admin/media
  role_min      TEXT NOT NULL DEFAULT 'moderator', -- moderator | editor | admin
  -- Idempotency: the same condition must not produce a row per run.
  dedupe_key    TEXT,
  read_at       TEXT,
  emailed_at    TEXT,
  created_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_dedupe
  ON admin_notifications (dedupe_key);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recent
  ON admin_notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (read_at, created_at);
