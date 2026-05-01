ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS subject_type TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS subject_id UUID NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id)
    WHERE read_at IS NULL;
