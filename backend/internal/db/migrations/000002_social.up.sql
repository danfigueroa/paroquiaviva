CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    friend_user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, friend_user_id),
    CHECK (user_id <> friend_user_id)
);

CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships (friend_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_status ON group_join_requests (group_id, status, requested_at);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_status ON group_join_requests (user_id, status, requested_at DESC);
