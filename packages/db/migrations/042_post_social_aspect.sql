-- Which frame the link preview uses.
--
-- Facebook and Instagram do not crop 4:5, so the portrait poster is the better
-- default when one exists. Some stories are stronger in landscape, though, and
-- the editor should be able to say so without deleting the portrait. The value
-- is a preference, not a guarantee: if 4:5 is chosen but no portrait has been
-- rendered, metadata falls back to the post's own image.

ALTER TABLE posts ADD COLUMN social_share_aspect TEXT NOT NULL DEFAULT '4:5';
