-- ============================================================
-- Vector index for embedding similarity (libSQL vec0).
-- Only applied on backends that ship the vec0 module (Turso; not the
-- local `file:` libsql build). The migrate runner skips this file when
-- the module is unavailable — dedup falls back to pure-JS cosine.
-- ============================================================
CREATE VIRTUAL TABLE IF NOT EXISTS posts_vec USING vec0(
  post_id TEXT PRIMARY KEY,
  embedding FLOAT[1536] distance_metric=cosine
);