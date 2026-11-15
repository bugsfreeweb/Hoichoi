-- Verification records.
--
-- The site used to print "FACT-CHECKED" on every card while storing nothing that
-- could justify it. A badge is only worth showing if there is a row behind it, so
-- this migration adds the record and the evidence tables.
--
-- `verification_status` is the *claim grade*:
--   unverified     — aggregated/rewritten, only the single source is known
--   single_source  — one independent source, quoted and linked
--   multi_source   — two or more independent sources agree
--   human_verified — a named editor checked it (verified_by + verified_at set)
--   corrected      — published, then materially corrected (see correction_history)
--
-- `claims` holds individual checkable statements with their evidence link, so
-- "verified" can be inspected claim by claim instead of trusted as a label.

ALTER TABLE posts ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE posts ADD COLUMN verification_note TEXT;
ALTER TABLE posts ADD COLUMN verified_by TEXT;
ALTER TABLE posts ADD COLUMN verified_at TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_verification ON posts(verification_status);

CREATE TABLE IF NOT EXISTS claims (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  claim_bn      TEXT NOT NULL,              -- the statement as published
  status        TEXT NOT NULL DEFAULT 'unchecked', -- unchecked | supported | disputed | false
  evidence_url  TEXT,
  evidence_note TEXT,
  checked_by    TEXT,
  checked_at    TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claims_post ON claims(post_id);

CREATE TABLE IF NOT EXISTS correction_history (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,               -- title_bn | body_bn | summary_bn ...
  old_value   TEXT,
  new_value   TEXT,
  reason      TEXT,
  corrected_by TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corrections_post ON correction_history(post_id, created_at DESC);
