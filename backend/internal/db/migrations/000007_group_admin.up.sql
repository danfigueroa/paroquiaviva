CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id_active
  ON group_memberships (group_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_group_memberships_role
  ON group_memberships (group_id, role)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_groups_active
  ON groups (id)
  WHERE deleted_at IS NULL;
