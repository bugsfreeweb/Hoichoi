-- Advertising policy review.
--
-- 68  a "approve & launch" button that only flips a status is not a policy: the
--     person clicking it has to say, in the record, that the ad was looked at and
--     that each rule was satisfied. The review row is the evidence; activation is
--     refused without one.
--
-- A table rather than a column on `ad_bookings`: SQLite cannot add a column
-- idempotently, and keeping the history means a second review of the same
-- booking (after a creative swap) is visible instead of overwriting the first.

CREATE TABLE IF NOT EXISTS ad_policy_reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  checks_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  reviewer TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_policy_reviews_booking ON ad_policy_reviews (booking_id, created_at DESC);
