-- Optional copy for the link card.
--
-- The article headline is written for the page; a link card is read in a feed,
-- often at half the width and beside someone else's post. Editors need to
-- tighten the hook without changing the published headline. Null means "use the
-- article title/summary", so old rows and untouched posts behave exactly as
-- before.

ALTER TABLE posts ADD COLUMN social_title TEXT;
ALTER TABLE posts ADD COLUMN social_description TEXT;
