-- Second factor + login lockout for privileged accounts.
--
-- 17  an admin account can be protected by an authenticator app; the secret
--     never leaves the row, codes are never echoed back after enrollment, and a
--     used step cannot be replayed.
-- 16  failed logins are counted per email hash so a guessed code cannot be
--     brute-forced at HTTP speed. The window and the threshold are constants in
--     code (login-guard.ts), not columns somebody can quietly widen.

CREATE TABLE IF NOT EXISTS admin_mfa (
  email TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  recovery_codes_json TEXT,
  last_used_step INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  ip_hash TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'bad_code', 'locked')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts (created_at DESC);
