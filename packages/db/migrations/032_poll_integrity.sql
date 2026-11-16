-- 032: poll integrity.
--
-- A poll vote was (poll, option, session id) and nothing else, so a script could
-- clear the cookie and vote again and the tally would look legitimate. Sessions
-- were the only defence and sessions are free.
--
-- Now each vote carries the network it came from (hashed) and can be invalidated
-- by an operator after review. Results exclude invalidated votes; nothing is
-- deleted, because "we removed 412 votes" has to remain an auditable claim.
ALTER TABLE poll_votes ADD COLUMN ip_hash TEXT;
ALTER TABLE poll_votes ADD COLUMN invalidated_at TEXT;
ALTER TABLE poll_votes ADD COLUMN invalid_reason TEXT;
ALTER TABLE poll_votes ADD COLUMN invalidated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_poll_votes_ip ON poll_votes (poll_id, ip_hash);
CREATE INDEX IF NOT EXISTS idx_poll_votes_valid ON poll_votes (poll_id, invalidated_at);
