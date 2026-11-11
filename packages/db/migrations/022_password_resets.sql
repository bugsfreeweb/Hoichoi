-- ============================================================
-- 022 · password reset tokens
--
-- One table for both principal kinds because the flow is identical:
-- admin console accounts (kind = 'admin') and advertiser portal accounts
-- (kind = 'advertiser'). The raw token is never stored — only its SHA-256 —
-- so a database read cannot be replayed as a reset link.
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'advertiser')),
  principal TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_resets_principal
  ON password_resets (kind, principal, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_resets_expiry
  ON password_resets (expires_at);
