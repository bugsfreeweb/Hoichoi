-- 047_remap_legacy_desks.sql
-- Published stories sitting on deactivated legacy desks disappear from every
-- category page even though they still appear on the home feed. Move them onto
-- the fixed taxonomy. This is a data remap, not a new desk.

UPDATE posts SET category = 'technology'   WHERE category = 'tech';
UPDATE posts SET category = 'technology'   WHERE category = 'tutorial';
UPDATE posts SET category = 'analysis'     WHERE category = 'research';
UPDATE posts SET category = 'misc'         WHERE category = 'accident';
UPDATE posts SET category = 'opinion'      WHERE category IN ('inspiration', 'history-traditions', 'literature');
UPDATE posts SET category = 'international' WHERE category = 'diaspora';
UPDATE posts SET category = 'social-media' WHERE category = 'viral';
UPDATE posts SET category = 'bangladesh'   WHERE category IN ('social-welfare', 'helping-others');
UPDATE posts SET category = 'health'       WHERE category = 'medical-science';
UPDATE posts SET category = 'agriculture'  WHERE category = 'rural-life';
UPDATE posts SET category = 'misc'         WHERE category = 'uncategorized';
