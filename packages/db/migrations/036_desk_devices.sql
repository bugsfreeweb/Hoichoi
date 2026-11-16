-- Device tokens for the desktop desk console.
--
-- 19  the desktop identifies itself with a token instead of holding database
--     credentials: every desk call names a device, and revoking the row stops
--     that machine immediately.
-- 40  no long-lived database credential ships to a laptop; the secret lives only
--     in the server environment, and the token is what crosses the wire.
--
-- Only a SHA-256 of the token is stored. `prefix` is the first six characters,
-- kept so an operator can tell two devices apart in a list without the token
-- being recoverable from the row.

CREATE TABLE IF NOT EXISTS desk_devices (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  last_used_at TEXT,
  revoked_at TEXT,
  revoked_by TEXT,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_desk_devices_email ON desk_devices (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_desk_devices_token ON desk_devices (token_hash);
