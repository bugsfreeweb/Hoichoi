ALTER TABLE polls ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE polls ADD COLUMN starts_at TEXT NOT NULL DEFAULT '';
ALTER TABLE polls ADD COLUMN ends_at TEXT;
ALTER TABLE polls ADD COLUMN allow_multiple INTEGER NOT NULL DEFAULT 0;
ALTER TABLE polls ADD COLUMN results_mode TEXT NOT NULL DEFAULT 'after-vote'
  CHECK (results_mode IN ('after-vote', 'always', 'after-close'));
ALTER TABLE polls ADD COLUMN impressions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE polls ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;

UPDATE polls SET starts_at = created_at WHERE starts_at = '';
