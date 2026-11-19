-- ============================================================
-- The public window, compared as numbers
--
-- The view from 001 compared `strftime('%s', published_at)` — which SQLite
-- returns as **TEXT** — against `strftime('%s','now') - n`, which is a
-- **NUMBER**. SQLite orders values by storage class before value: every TEXT is
-- greater than every number. So `text >= number` was true for every row and the
-- 7-day window silently matched the whole table: the live site served 1 451
-- published posts whose oldest was 58 days old.
--
-- CAST makes the comparison numeric, which is what the window always meant. The
-- same type mistake lived in `checkAndArchive` / `purgeExpired`, so nothing ever
-- rolled over and the retention purge had no candidates — a daily job that
-- "succeeded" for a month while doing nothing.
--
-- `ttl_ms` had the same shape and was already numeric through subtraction, but it
-- is CAST too so the two expressions cannot drift apart again.
-- ============================================================

-- A published post with no date was invisible to the window (NULL compares to
-- nothing) and unarchivable. The row's own creation time is the honest date: it
-- is when the story entered the system.
UPDATE posts
SET published_at = created_at
WHERE published_at IS NULL AND status = 'published';

DROP VIEW IF EXISTS posts_current_window;
CREATE VIEW posts_current_window AS
SELECT
  p.*,
  (
    CAST(strftime('%s', p.published_at) AS INTEGER)
    + (s.archive_visible_days * 86400)
    - CAST(strftime('%s', 'now') AS INTEGER)
  ) * 1000 AS ttl_ms
FROM posts p
CROSS JOIN settings s
WHERE p.status = 'published'
  AND p.archived_at IS NULL
  AND (
    (p.category = 'missing-children' AND p.case_status = 'active')
    OR
    CAST(strftime('%s', p.published_at) AS INTEGER)
      >= CAST(strftime('%s', 'now') AS INTEGER) - (s.archive_visible_days * 86400)
  );
