DROP INDEX IF EXISTS idx_prayer_requests_tradition_created_at;
DROP INDEX IF EXISTS idx_prayer_requests_tradition_public_feed;

ALTER TABLE prayer_requests DROP COLUMN IF EXISTS tradition;
ALTER TABLE users           DROP COLUMN IF EXISTS tradition;

DROP TYPE IF EXISTS tradition;
