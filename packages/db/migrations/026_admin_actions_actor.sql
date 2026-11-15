-- Audit trail, part 2: make `admin_actions` survive its actors.
--
-- `admin_actions` already existed and eighteen routes write to it, but a row
-- recorded only `admin_user_id`. That means (a) a later join is required to know
-- who acted, and (b) deleting or renaming a user erases the identity from the
-- trail. Credential and destructive routes (providers, settings, purge, mail,
-- import, maintenance) wrote nothing at all.
--
-- This migration snapshots the actor on the row itself and adds a hashed IP for
-- correlation. Existing rows are backfilled from `admin_users`, and a trigger
-- fills the snapshot for any older INSERT that never learned the new columns.

ALTER TABLE admin_actions ADD COLUMN actor_email TEXT;
ALTER TABLE admin_actions ADD COLUMN actor_role TEXT;
ALTER TABLE admin_actions ADD COLUMN ip_hash TEXT;

UPDATE admin_actions
   SET actor_email = (SELECT email FROM admin_users WHERE id = admin_actions.admin_user_id)
 WHERE actor_email IS NULL;

UPDATE admin_actions
   SET actor_role = (SELECT role FROM admin_users WHERE id = admin_actions.admin_user_id)
 WHERE actor_role IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor ON admin_actions(actor_email, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_admin_actions_actor
AFTER INSERT ON admin_actions
WHEN NEW.actor_email IS NULL
BEGIN
  UPDATE admin_actions
     SET actor_email = (SELECT email FROM admin_users WHERE id = NEW.admin_user_id),
         actor_role  = (SELECT role  FROM admin_users WHERE id = NEW.admin_user_id)
   WHERE id = NEW.id;
END;
