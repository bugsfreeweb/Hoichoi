-- Audit follow-ups: an AI run ledger, a deletion ledger.
--
-- 50/51/5  every gateway call records provider, characters and latency, so
--          "cost and speed" is a row and not a guess.
-- 38       deletions get a ledger row: what went, why, and who asked.
--
-- The *columns* this feature also needs (posts.ai_assisted,
-- posts.ai_prompt_version, settings.collection_paused) are added by
-- `ensureAiProvenanceColumns()` in client.ts, next to the other column upgrade
-- helpers. SQLite has no `ADD COLUMN IF NOT EXISTS`, so putting ALTERs in a
-- migration makes it non-idempotent: a half-applied run cannot be retried. Tables
-- and indexes are idempotent and belong here.

CREATE TABLE IF NOT EXISTS ai_task_runs (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  input_chars INTEGER NOT NULL,
  output_chars INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  ok INTEGER NOT NULL DEFAULT 1,
  error_kind TEXT,
  actor TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_task_runs_created ON ai_task_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_task_runs_task ON ai_task_runs (task, created_at DESC);

CREATE TABLE IF NOT EXISTS deletion_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'media', 'comment', 'report', 'live_event')),
  entity_id TEXT NOT NULL,
  reason TEXT,
  actor TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_created ON deletion_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_log_entity ON deletion_log (entity_type, entity_id);
