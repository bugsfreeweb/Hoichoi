-- 029: media provider registry + health.
--
-- Media uploads fail over between GitHub and S3 targets, and until now the only
-- trace of a failing target was a log line: the desk could not see that one
-- bucket had been dead for a week and every upload was quietly using the backup,
-- nor how close a repo was to its quota.
--
-- One row per provider (storage adapter or image provider). Counters are
-- maintained by the uploader; `cooldown_until` is what makes a broken target
-- stop being tried first on every single upload.
CREATE TABLE IF NOT EXISTS media_provider_health (
  provider_key        TEXT PRIMARY KEY,           -- 'github:owner/repo', 's3:idrivee2:bucket', 'image:google/...'
  kind                TEXT NOT NULL,              -- github | s3 | image | local
  label               TEXT NOT NULL DEFAULT '',
  enabled             INTEGER NOT NULL DEFAULT 1,
  -- NULL quota = unknown or unlimited. Never guessed from plan size.
  quota_bytes         INTEGER,
  used_bytes          INTEGER NOT NULL DEFAULT 0,
  objects             INTEGER NOT NULL DEFAULT 0,
  success_count       INTEGER NOT NULL DEFAULT 0,
  failure_count       INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at     TEXT,
  last_failure_at     TEXT,
  last_error          TEXT,
  -- Why the uploader moved past this provider on the most recent attempt.
  last_fallback_reason TEXT,
  -- While set, the provider is skipped (unless every provider is cooling down).
  cooldown_until      TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_health_kind ON media_provider_health (kind, enabled);
CREATE INDEX IF NOT EXISTS idx_provider_health_cooldown ON media_provider_health (cooldown_until);
