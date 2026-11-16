-- 031: guest identity hardening.
--
-- Public forms (comment, report, submission, removal request) used to store
-- whatever email the guest typed, plus whatever the edge said the IP was, and
-- nothing tied two submissions from the same person together. That is both a
-- privacy problem (raw addresses at rest) and a moderation blind spot (a repeat
-- abusive guest is indistinguishable from a first-time one).
--
-- These columns store:
--   guest_id    an opaque random id in a long-lived cookie, so a guest can be
--               recognised without being identified
--   email_hash  HMAC of the normalised address — lets us match rows without
--               keeping the address, and is not reversible without the secret
--   ip_hash     HMAC of the client IP — same idea, never the raw address
--   trust_score 0..100 derived from that guest's history; NULL means unknown
--
-- The raw email column is left in place: answering a report or a submission is a
-- real operational need. Data-subject export/erase exists for the rest.
ALTER TABLE comments ADD COLUMN guest_id TEXT;
ALTER TABLE comments ADD COLUMN email_hash TEXT;
ALTER TABLE comments ADD COLUMN ip_hash TEXT;
ALTER TABLE comments ADD COLUMN trust_score INTEGER;

ALTER TABLE reader_reports ADD COLUMN guest_id TEXT;
ALTER TABLE reader_reports ADD COLUMN email_hash TEXT;
ALTER TABLE reader_reports ADD COLUMN ip_hash TEXT;
ALTER TABLE reader_reports ADD COLUMN trust_score INTEGER;

ALTER TABLE submitted_pages ADD COLUMN guest_id TEXT;
ALTER TABLE submitted_pages ADD COLUMN email_hash TEXT;
ALTER TABLE submitted_pages ADD COLUMN ip_hash TEXT;
ALTER TABLE submitted_pages ADD COLUMN trust_score INTEGER;

ALTER TABLE removal_requests ADD COLUMN guest_id TEXT;
ALTER TABLE removal_requests ADD COLUMN email_hash TEXT;
ALTER TABLE removal_requests ADD COLUMN ip_hash TEXT;
ALTER TABLE removal_requests ADD COLUMN trust_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_comments_guest ON comments (guest_id);
CREATE INDEX IF NOT EXISTS idx_comments_email_hash ON comments (email_hash);
CREATE INDEX IF NOT EXISTS idx_reports_guest ON reader_reports (guest_id);
CREATE INDEX IF NOT EXISTS idx_reports_email_hash ON reader_reports (email_hash);
CREATE INDEX IF NOT EXISTS idx_submitted_guest ON submitted_pages (guest_id);
CREATE INDEX IF NOT EXISTS idx_removal_guest ON removal_requests (guest_id);
