DROP INDEX IF EXISTS idx_users_username_unique;
ALTER TABLE users DROP COLUMN IF EXISTS username;
