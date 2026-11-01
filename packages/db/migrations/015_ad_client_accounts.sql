-- Password-backed client accounts and isolated client sessions for the ad portal.
ALTER TABLE ad_clients ADD COLUMN password_hash TEXT;

CREATE TABLE IF NOT EXISTS ad_client_sessions (
  token_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_client_sessions_client
  ON ad_client_sessions (client_id);
