-- Rate limiting.
--
-- Login, comment posting, story submission, abuse reports, poll votes, tracking
-- pings and ad events all had no throttle at all: a single client could brute
-- force one-time codes, flood comments, or stuff the ad counter. A counter table
-- keyed by (bucket, fixed window) lets every serverless instance share one
-- budget without an external service.
--
-- `bucket` is an opaque, already-hashed string ("login:ip:<sha256>"), never a
-- raw address, so this table is not a new store of personal data.

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
