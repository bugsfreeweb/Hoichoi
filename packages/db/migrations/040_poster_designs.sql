-- Anti-repetition memory for the dynamic poster.
--
-- The brief asks that no two consecutive posters share a layout/palette pair.
-- A prompt instruction alone cannot guarantee that: an LLM asked to "avoid these"
-- may still return one, and a retry has no memory of the attempt before it. So
-- every rendered design is a row, the recent rows are read before the next art
-- direction call, and the renderer enforces the rule on the model's own answer.
--
-- The row is also the design history an editor needs when they come back to a
-- story a week later and wonder which frame the paper published.

CREATE TABLE IF NOT EXISTS poster_designs (
  id            TEXT PRIMARY KEY,
  post_id       TEXT REFERENCES posts(id) ON DELETE SET NULL,
  layout_variant TEXT NOT NULL,
  palette_id    TEXT NOT NULL,
  visual_style  TEXT NOT NULL,
  texture       TEXT,
  headline      TEXT NOT NULL,
  media_path    TEXT,
  created_by    TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_poster_designs_created ON poster_designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poster_designs_post ON poster_designs(post_id, created_at DESC);
