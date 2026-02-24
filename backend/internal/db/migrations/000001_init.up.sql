CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_category') THEN
        CREATE TYPE prayer_category AS ENUM ('HEALTH', 'FAMILY', 'WORK', 'GRIEF', 'THANKSGIVING', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_visibility') THEN
        CREATE TYPE prayer_visibility AS ENUM ('PUBLIC', 'GROUP_ONLY', 'PRIVATE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_status') THEN
        CREATE TYPE prayer_status AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'CLOSED', 'ARCHIVED', 'REMOVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_join_policy') THEN
        CREATE TYPE group_join_policy AS ENUM ('OPEN', 'REQUEST', 'INVITE_ONLY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
        CREATE TYPE group_role AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action_type') THEN
        CREATE TYPE moderation_action_type AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'REMOVE', 'BAN');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    join_policy group_join_policy NOT NULL,
    requires_moderation BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role group_role NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category prayer_category NOT NULL,
    visibility prayer_visibility NOT NULL,
    allow_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status prayer_status NOT NULL,
    prayed_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prayer_request_groups (
    prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id),
    group_id UUID NOT NULL REFERENCES groups(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (prayer_request_id, group_id)
);

CREATE TABLE IF NOT EXISTS prayer_request_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id),
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prayer_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id),
    action_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id),
    group_id UUID REFERENCES groups(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    target_request_id UUID REFERENCES prayer_requests(id),
    target_group_id UUID REFERENCES groups(id),
    action moderation_action_type NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_email_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_requests_public_feed ON prayer_requests (status, created_at DESC) WHERE visibility = 'PUBLIC' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_requests_author_id ON prayer_requests (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_request_groups_group_id ON prayer_request_groups (group_id, prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_request_updates_prayer_request_id ON prayer_request_updates (prayer_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_actions_user_request_created_at ON prayer_actions (user_id, prayer_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created_at ON moderation_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_request_id ON moderation_actions (target_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bans_group_user ON bans (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications (user_id, created_at DESC);
