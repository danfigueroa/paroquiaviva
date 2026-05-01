ALTER TABLE notifications
    DROP COLUMN IF EXISTS subject_id,
    DROP COLUMN IF EXISTS subject_type,
    DROP COLUMN IF EXISTS actor_user_id;
