-- Footer customization + admin login log (migration 009).
-- Ran via `pnpm db:migrate` for the web/cloud DB; the desktop runner applies
-- the same upgrades idempotently through ensureFooterColumns/ensureLoginLogTable.

ALTER TABLE category_configs ADD COLUMN show_in_footer INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN footer_about_bn TEXT;

CREATE TABLE IF NOT EXISTS admin_login_log (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  user_agent TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_log_created ON admin_login_log (created_at DESC);