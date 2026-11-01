DROP INDEX IF EXISTS idx_poll_votes_poll;
ALTER TABLE poll_votes RENAME TO poll_votes_single_choice;

CREATE TABLE poll_votes (
  id TEXT PRIMARY KEY,
  poll_id INTEGER NOT NULL,
  option_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (poll_id, session_id, option_id)
);

INSERT INTO poll_votes (id, poll_id, option_id, session_id, created_at)
SELECT id, poll_id, option_id, session_id, created_at FROM poll_votes_single_choice;

DROP TABLE poll_votes_single_choice;
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);
