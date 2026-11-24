-- The same art direction is published in two frames.
--
-- 16:9 is the web card and the video thumbnail; 4:5 is the uncropped Facebook
-- and Instagram feed post. The design row needs to say which frame it is, so
-- the CMS history can show both and the anti-repetition window can tell a
-- portrait from its landscape sibling.

ALTER TABLE poster_designs ADD COLUMN aspect TEXT NOT NULL DEFAULT '16:9';
