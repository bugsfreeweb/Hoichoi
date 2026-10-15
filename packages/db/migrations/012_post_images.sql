-- 012: post gallery images. Extra images attached to a post beyond its single
-- primary `posts.media_path`. `source` distinguishes images mirrored by the
-- collector from the source post ("collector") from images an operator attached
-- in the web/desktop editor ("admin"). Display order is `position`.

CREATE TABLE IF NOT EXISTS post_images (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image',
  position INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images (post_id, position);
