-- A rendered poster has to outlive the request that made it.
-- Vercel's filesystem is read-only and a function response is capped at 4.5 MB,
-- so when no remote media adapter is configured the generated JPEG is stored
-- here and served by GET /api/posters/:id.
CREATE TABLE IF NOT EXISTS poster_images (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  aspect TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  data TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_poster_images_post ON poster_images (post_id, created_at DESC);
