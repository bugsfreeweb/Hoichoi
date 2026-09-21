-- Category dot color. The UI (desk + web) has always sent dot with every
-- create/update, but the column never existed — `updateCategory` issued
-- `SET dot = ?` against a table without it, so every category edit failed
-- with "no such column: dot" on both desktop and web admin. Add the column
-- and backfill the seed colors (stored as #hex so CSS uses them directly).
ALTER TABLE category_configs ADD COLUMN dot TEXT;

UPDATE category_configs SET dot = '#2563eb' WHERE slug = 'child-sexual-abuse';
UPDATE category_configs SET dot = '#d2202c' WHERE slug = 'extramarital-crime';
UPDATE category_configs SET dot = '#0d9488' WHERE slug = 'missing-children';

-- Normalize any stored/unprefixed hex (e.g. legacy "2563eb") to #hex.
UPDATE category_configs
SET dot = '#' || dot
WHERE dot IS NOT NULL
  AND dot != ''
  AND substr(dot, 1, 1) != '#';