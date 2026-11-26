-- 048_canonicalize_new_desks.sql
-- New pipeline rows could still carry legacy descriptors after the taxonomy
-- migration, because classification normalised only the corruption case. Make
-- the stored desks fixed and return any sensitive desk that slipped through to
-- human review.

UPDATE posts SET category = 'technology' WHERE category = 'tech';
UPDATE posts SET category = 'misc'       WHERE category = 'accident';
UPDATE posts SET category = 'analysis'   WHERE category = 'research';
UPDATE posts SET category = 'health'     WHERE category = 'medical-science';
UPDATE posts SET category = 'agriculture' WHERE category = 'rural-life';
UPDATE posts SET category = 'bangladesh' WHERE category IN ('social-welfare', 'helping-others');

UPDATE posts
   SET status = 'pending_review',
       is_feature_eligible = 0,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
 WHERE status = 'published'
   AND category IN ('child-sexual-abuse', 'extramarital-crime', 'missing-children');
