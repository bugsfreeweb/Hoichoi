-- 024 · Admin credential lifecycle
--
-- Before this migration `admin_sessions` had four columns and a session lived
-- for 365 days, renewed on every request. There was no way to answer "which
-- devices are signed in", "when was this session last used", or "who revoked
-- it" — so a stolen cookie could never be identified or cut off, and the
-- 30-day credential expiry required for admin access was not enforceable.
--
-- All columns are nullable so existing rows survive the deploy. `last_used_at`
-- is backfilled from `created_at`, which makes the idle window apply from the
-- last known activity rather than from NULL.

ALTER TABLE admin_sessions ADD COLUMN device_id TEXT;
ALTER TABLE admin_sessions ADD COLUMN device_name TEXT;
ALTER TABLE admin_sessions ADD COLUMN device_os TEXT;
ALTER TABLE admin_sessions ADD COLUMN app_version TEXT;
-- Stored hashed, never raw: an IP plus a user agent is enough to single out a
-- person, and the console only needs to tell sessions apart.
ALTER TABLE admin_sessions ADD COLUMN ip_hash TEXT;
ALTER TABLE admin_sessions ADD COLUMN user_agent_hash TEXT;
ALTER TABLE admin_sessions ADD COLUMN last_used_at TEXT;
ALTER TABLE admin_sessions ADD COLUMN revoked_at TEXT;
ALTER TABLE admin_sessions ADD COLUMN revoked_by TEXT;
ALTER TABLE admin_sessions ADD COLUMN revoked_reason TEXT;

UPDATE admin_sessions SET last_used_at = created_at WHERE last_used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON admin_sessions (user_id, revoked_at);
