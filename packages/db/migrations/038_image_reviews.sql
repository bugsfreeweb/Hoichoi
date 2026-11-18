-- Per-image approval records.
--
-- Moderation approves a *post*; a post can carry a primary image plus a gallery.
-- The pipeline's prompt policy stops an obviously bad picture being generated,
-- but nothing recorded which of a post's images a human had actually looked at,
-- so "reviewed before publish" was a sentence without a row behind it.
--
-- One row per decision. The standing verdict for a path is the newest row for
-- that path; a rejection is never deleted, it is superseded by a later approval
-- (so the history of who let something through survives). A path with no row has
-- no verdict — and no verdict is not an approval.

CREATE TABLE IF NOT EXISTS image_reviews (
  id          TEXT PRIMARY KEY,
  post_id     TEXT REFERENCES posts(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,                -- media path or URL of the image
  verdict     TEXT NOT NULL,                -- approved | rejected
  reason      TEXT,
  reviewed_by TEXT NOT NULL,                -- actor email snapshot
  reviewed_at TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_image_reviews_post ON image_reviews(post_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_reviews_path ON image_reviews(path);
