-- Editorial trust metadata.
--
-- A rewrite-quality score is not a fact-check. Keep the two in separate
-- columns so no surface can promote one into the other:
--   ai_rewrite_quality_score  score of the AI rewrite (0..1)
--   verification_status       human/source claim grade
--   verification_evidence     JSON array of URLs/notes backing that grade
--
-- `source_type` is derived from the original URL by the pipeline and backfilled
-- here, so every card can print what kind of source it came from without a
-- second query. `is_feature_eligible` is false for anything that must not be
-- auto-featured (sensitive desks, allegations, unverified social posts).

ALTER TABLE posts ADD COLUMN verification_evidence TEXT NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN reviewer_id TEXT;
ALTER TABLE posts ADD COLUMN review_notes TEXT;
ALTER TABLE posts ADD COLUMN source_type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE posts ADD COLUMN source_reliability_score REAL;
ALTER TABLE posts ADD COLUMN ai_rewrite_quality_score REAL;
ALTER TABLE posts ADD COLUMN is_human_reviewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN is_feature_eligible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN feature_approved_by TEXT;
ALTER TABLE posts ADD COLUMN feature_approved_at TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_source_type ON posts(source_type);
CREATE INDEX IF NOT EXISTS idx_posts_feature_eligible ON posts(is_feature_eligible, status, published_at);

-- Backfill source type from the original link. A domain check beats the source
-- display name (which an operator can rename), and the fallback keeps old rows
-- honest: "unknown" rather than guessing "news".
UPDATE posts SET source_type = 'facebook'
 WHERE lower(source_url) LIKE '%facebook.com%' OR lower(source_url) LIKE '%fb.com%';
UPDATE posts SET source_type = 'government'
 WHERE source_url LIKE '%.gov%' OR source_url LIKE '%.gov.bd%' OR source_url LIKE '%government%';
UPDATE posts SET source_type = 'news'
 WHERE source_type = 'unknown'
   AND (lower(source_url) LIKE 'http%://%'
        OR lower(source_name) IN ('techcrunch','bbc','bbc bangla','bbc technology','hacker news','dhaka tribune'));

-- The old vocabulary mixed evidence strength with verification. Keep the
-- strongest legacy grade only when it is actually backed by a reviewer.
UPDATE posts SET is_human_reviewed = 1
 WHERE verification_status IN ('human_verified','multi_source','single_source')
   AND verified_by IS NOT NULL AND trim(verified_by) <> '';
UPDATE posts SET verification_status = 'source_claimed'
 WHERE verification_status = 'single_source';
UPDATE posts SET verification_status = 'partially_verified'
 WHERE verification_status = 'multi_source';
UPDATE posts SET verification_status = 'partially_verified'
 WHERE verification_status = 'human_verified'
   AND (verified_by IS NULL OR trim(verified_by) = '' OR verified_at IS NULL);
UPDATE posts SET verification_status = 'verified'
 WHERE verification_status = 'human_verified'
   AND verified_by IS NOT NULL AND trim(verified_by) <> '' AND verified_at IS NOT NULL
   AND verification_evidence <> '[]';

-- Nothing published before this migration was approved for the lead slot.
UPDATE posts SET is_feature_eligible = 0 WHERE is_feature_eligible = 1;
