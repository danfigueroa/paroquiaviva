DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tradition') THEN
        CREATE TYPE tradition AS ENUM ('CATHOLIC', 'EVANGELICAL');
    END IF;
END $$;

ALTER TABLE users           ADD COLUMN IF NOT EXISTS tradition tradition;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS tradition tradition;

UPDATE users           SET tradition = 'CATHOLIC' WHERE tradition IS NULL;
UPDATE prayer_requests SET tradition = 'CATHOLIC' WHERE tradition IS NULL;

ALTER TABLE users           ALTER COLUMN tradition SET NOT NULL;
ALTER TABLE users           ALTER COLUMN tradition SET DEFAULT 'CATHOLIC';
ALTER TABLE prayer_requests ALTER COLUMN tradition SET NOT NULL;
ALTER TABLE prayer_requests ALTER COLUMN tradition SET DEFAULT 'CATHOLIC';

CREATE INDEX IF NOT EXISTS idx_prayer_requests_tradition_public_feed
    ON prayer_requests (tradition, status, created_at DESC)
    WHERE visibility = 'PUBLIC' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_tradition_created_at
    ON prayer_requests (tradition, created_at DESC)
    WHERE deleted_at IS NULL;
