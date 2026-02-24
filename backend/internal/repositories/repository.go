package repositories

import (
	"context"
	"errors"

	"parish-viva/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicatePrayedAction = errors.New("duplicate prayed action")
var ErrInviteOnlyGroup = errors.New("invite only group")
var ErrGroupAdminRequired = errors.New("group admin required")
var ErrJoinRequestNotFound = errors.New("join request not found")

type Repository interface {
	GetUserByID(ctx context.Context, userID string) (models.User, error)
	UpdateUserProfile(ctx context.Context, userID, displayName string, avatarURL *string) (models.User, error)
	CreatePrayerRequest(ctx context.Context, in models.CreatePrayerRequestInput) (models.PrayerRequest, error)
	ListPublicPrayerRequests(ctx context.Context, limit, offset int) ([]models.PrayerRequest, error)
	ListGroupsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error)
	ListFriendsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error)
	ListHomePrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error)
	RecordPrayedAction(ctx context.Context, userID, requestID string, windowHours int) error
	ListUserGroups(ctx context.Context, userID string) ([]models.Group, error)
	CreateGroup(ctx context.Context, userID, name, description string, imageURL *string, joinPolicy models.GroupJoinPolicy) (models.Group, error)
	RequestJoinGroup(ctx context.Context, userID, groupID string) error
	ListGroupJoinRequests(ctx context.Context, actorUserID, groupID string) ([]models.GroupJoinRequest, error)
	ApproveGroupJoinRequest(ctx context.Context, actorUserID, groupID, requestID string) error
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, userID string) (models.User, error) {
	var u models.User
	err := r.db.QueryRow(ctx, `
		SELECT id::text, email, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`, userID).Scan(&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *PostgresRepository) UpdateUserProfile(ctx context.Context, userID, displayName string, avatarURL *string) (models.User, error) {
	var u models.User
	err := r.db.QueryRow(ctx, `
		UPDATE users
		SET display_name = $2, avatar_url = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id::text, email, display_name, avatar_url, created_at, updated_at
	`, userID, displayName, avatarURL).Scan(&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *PostgresRepository) CreatePrayerRequest(ctx context.Context, in models.CreatePrayerRequestInput) (models.PrayerRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.PrayerRequest{}, err
	}
	defer tx.Rollback(ctx)

	var pr models.PrayerRequest
	err = tx.QueryRow(ctx, `
		INSERT INTO prayer_requests (author_id, title, body, category, visibility, allow_anonymous, status)
		VALUES ($1, $2, $3, $4, $5, $6,
			CASE WHEN $5 = 'PUBLIC' THEN 'PENDING_REVIEW' ELSE 'ACTIVE' END)
		RETURNING id::text, author_id::text, title, body, category, visibility, allow_anonymous, status, prayed_count, created_at, updated_at
	`, in.AuthorID, in.Title, in.Body, in.Category, in.Visibility, in.AllowAnonymous).
		Scan(&pr.ID, &pr.AuthorID, &pr.Title, &pr.Body, &pr.Category, &pr.Visibility, &pr.AllowAnonymous, &pr.Status, &pr.PrayedCount, &pr.CreatedAt, &pr.UpdatedAt)
	if err != nil {
		return models.PrayerRequest{}, err
	}

	for _, groupID := range in.GroupIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO prayer_request_groups (prayer_request_id, group_id)
			VALUES ($1, $2)
		`, pr.ID, groupID)
		if err != nil {
			return models.PrayerRequest{}, err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return models.PrayerRequest{}, err
	}
	return pr, nil
}

func (r *PostgresRepository) ListPublicPrayerRequests(ctx context.Context, limit, offset int) ([]models.PrayerRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id::text, author_id::text, title, body, category, visibility, allow_anonymous, status, prayed_count, created_at, updated_at
		FROM prayer_requests
		WHERE visibility = 'PUBLIC' AND status = 'ACTIVE' AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.PrayerRequest, 0)
	for rows.Next() {
		var pr models.PrayerRequest
		err = rows.Scan(&pr.ID, &pr.AuthorID, &pr.Title, &pr.Body, &pr.Category, &pr.Visibility, &pr.AllowAnonymous, &pr.Status, &pr.PrayedCount, &pr.CreatedAt, &pr.UpdatedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, pr)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) RecordPrayedAction(ctx context.Context, userID, requestID string, windowHours int) error {
	ct, err := r.db.Exec(ctx, `
		INSERT INTO prayer_actions (user_id, prayer_request_id, action_type)
		SELECT $1, $2, 'PRAYED'
		WHERE NOT EXISTS (
			SELECT 1
			FROM prayer_actions
			WHERE user_id = $1
			AND prayer_request_id = $2
			AND action_type = 'PRAYED'
			AND created_at > NOW() - ($3::text || ' hours')::interval
		)
	`, userID, requestID, windowHours)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrDuplicatePrayedAction
	}

	_, err = r.db.Exec(ctx, `
		UPDATE prayer_requests
		SET prayed_count = prayed_count + 1, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, requestID)
	return err
}

func (r *PostgresRepository) ListGroupsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT pr.id::text, pr.author_id::text, pr.title, pr.body, pr.category, pr.visibility, pr.allow_anonymous, pr.status, pr.prayed_count, pr.created_at, pr.updated_at
		FROM prayer_requests pr
		INNER JOIN prayer_request_groups prg ON prg.prayer_request_id = pr.id
		INNER JOIN group_memberships gm ON gm.group_id = prg.group_id
		WHERE gm.user_id = $1
			AND gm.deleted_at IS NULL
			AND pr.status = 'ACTIVE'
			AND pr.deleted_at IS NULL
		ORDER BY pr.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPrayerRequests(rows)
}

func (r *PostgresRepository) ListFriendsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	rows, err := r.db.Query(ctx, `
		WITH friend_ids AS (
			SELECT CASE WHEN user_id = $1 THEN friend_user_id ELSE user_id END AS friend_id
			FROM friendships
			WHERE status = 'ACCEPTED' AND (user_id = $1 OR friend_user_id = $1)
		)
		SELECT pr.id::text, pr.author_id::text, pr.title, pr.body, pr.category, pr.visibility, pr.allow_anonymous, pr.status, pr.prayed_count, pr.created_at, pr.updated_at
		FROM prayer_requests pr
		INNER JOIN friend_ids f ON f.friend_id = pr.author_id
		WHERE pr.visibility = 'PUBLIC'
			AND pr.status = 'ACTIVE'
			AND pr.deleted_at IS NULL
		ORDER BY pr.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPrayerRequests(rows)
}

func (r *PostgresRepository) ListHomePrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	rows, err := r.db.Query(ctx, `
		WITH friend_ids AS (
			SELECT CASE WHEN user_id = $1 THEN friend_user_id ELSE user_id END AS friend_id
			FROM friendships
			WHERE status = 'ACCEPTED' AND (user_id = $1 OR friend_user_id = $1)
		),
		home_requests AS (
			SELECT pr.id, pr.author_id, pr.title, pr.body, pr.category, pr.visibility, pr.allow_anonymous, pr.status, pr.prayed_count, pr.created_at, pr.updated_at
			FROM prayer_requests pr
			INNER JOIN friend_ids f ON f.friend_id = pr.author_id
			WHERE pr.visibility = 'PUBLIC' AND pr.status = 'ACTIVE' AND pr.deleted_at IS NULL
			UNION
			SELECT pr.id, pr.author_id, pr.title, pr.body, pr.category, pr.visibility, pr.allow_anonymous, pr.status, pr.prayed_count, pr.created_at, pr.updated_at
			FROM prayer_requests pr
			INNER JOIN prayer_request_groups prg ON prg.prayer_request_id = pr.id
			INNER JOIN group_memberships gm ON gm.group_id = prg.group_id
			WHERE gm.user_id = $1 AND gm.deleted_at IS NULL AND pr.status = 'ACTIVE' AND pr.deleted_at IS NULL
		)
		SELECT id::text, author_id::text, title, body, category, visibility, allow_anonymous, status, prayed_count, created_at, updated_at
		FROM home_requests
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPrayerRequests(rows)
}

func (r *PostgresRepository) ListUserGroups(ctx context.Context, userID string) ([]models.Group, error) {
	rows, err := r.db.Query(ctx, `
		SELECT g.id::text, g.name, g.description, g.image_url, g.join_policy, g.requires_moderation, g.created_by::text, g.created_at, g.updated_at
		FROM groups g
		INNER JOIN group_memberships gm ON gm.group_id = g.id
		WHERE gm.user_id = $1 AND gm.deleted_at IS NULL AND g.deleted_at IS NULL
		ORDER BY g.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Group, 0)
	for rows.Next() {
		var g models.Group
		err = rows.Scan(&g.ID, &g.Name, &g.Description, &g.ImageURL, &g.JoinPolicy, &g.RequiresModeration, &g.CreatedBy, &g.CreatedAt, &g.UpdatedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, g)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) CreateGroup(ctx context.Context, userID, name, description string, imageURL *string, joinPolicy models.GroupJoinPolicy) (models.Group, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.Group{}, err
	}
	defer tx.Rollback(ctx)

	var g models.Group
	err = tx.QueryRow(ctx, `
		INSERT INTO groups (name, description, image_url, join_policy, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, name, description, image_url, join_policy, requires_moderation, created_by::text, created_at, updated_at
	`, name, description, imageURL, joinPolicy, userID).Scan(&g.ID, &g.Name, &g.Description, &g.ImageURL, &g.JoinPolicy, &g.RequiresModeration, &g.CreatedBy, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return models.Group{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO group_memberships (group_id, user_id, role)
		VALUES ($1, $2, 'ADMIN')
	`, g.ID, userID)
	if err != nil {
		return models.Group{}, err
	}

	if err = tx.Commit(ctx); err != nil {
		return models.Group{}, err
	}
	return g, nil
}

func (r *PostgresRepository) RequestJoinGroup(ctx context.Context, userID, groupID string) error {
	var joinPolicy models.GroupJoinPolicy
	err := r.db.QueryRow(ctx, `
		SELECT join_policy
		FROM groups
		WHERE id = $1 AND deleted_at IS NULL
	`, groupID).Scan(&joinPolicy)
	if err != nil {
		return err
	}

	switch joinPolicy {
	case models.JoinPolicyOpen:
		_, err = r.db.Exec(ctx, `
			INSERT INTO group_memberships (group_id, user_id, role)
			VALUES ($1, $2, 'MEMBER')
			ON CONFLICT (group_id, user_id) DO UPDATE SET deleted_at = NULL, updated_at = NOW()
		`, groupID, userID)
		return err
	case models.JoinPolicyRequest:
		_, err = r.db.Exec(ctx, `
			INSERT INTO group_join_requests (group_id, user_id, status)
			VALUES ($1, $2, 'PENDING')
			ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'PENDING', requested_at = NOW(), reviewed_at = NULL, reviewed_by = NULL
		`, groupID, userID)
		return err
	default:
		return ErrInviteOnlyGroup
	}
}

func (r *PostgresRepository) ListGroupJoinRequests(ctx context.Context, actorUserID, groupID string) ([]models.GroupJoinRequest, error) {
	ok, err := r.isGroupAdmin(ctx, actorUserID, groupID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrGroupAdminRequired
	}

	rows, err := r.db.Query(ctx, `
		SELECT id::text, group_id::text, user_id::text, status, requested_at
		FROM group_join_requests
		WHERE group_id = $1 AND status = 'PENDING'
		ORDER BY requested_at ASC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.GroupJoinRequest, 0)
	for rows.Next() {
		var req models.GroupJoinRequest
		err = rows.Scan(&req.ID, &req.GroupID, &req.UserID, &req.Status, &req.RequestedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, req)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) ApproveGroupJoinRequest(ctx context.Context, actorUserID, groupID, requestID string) error {
	ok, err := r.isGroupAdmin(ctx, actorUserID, groupID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrGroupAdminRequired
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx, `
		UPDATE group_join_requests
		SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $1
		WHERE id = $2 AND group_id = $3 AND status = 'PENDING'
		RETURNING user_id::text
	`, actorUserID, requestID, groupID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrJoinRequestNotFound
		}
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO group_memberships (group_id, user_id, role)
		VALUES ($1, $2, 'MEMBER')
		ON CONFLICT (group_id, user_id) DO UPDATE SET deleted_at = NULL, updated_at = NOW()
	`, groupID, userID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) isGroupAdmin(ctx context.Context, userID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM groups g
			LEFT JOIN group_memberships gm ON gm.group_id = g.id AND gm.user_id = $1 AND gm.deleted_at IS NULL
			WHERE g.id = $2 AND g.deleted_at IS NULL
			AND (g.created_by = $1 OR gm.role = 'ADMIN')
		)
	`, userID, groupID).Scan(&exists)
	return exists, err
}

func scanPrayerRequests(rows pgx.Rows) ([]models.PrayerRequest, error) {
	items := make([]models.PrayerRequest, 0)
	for rows.Next() {
		var pr models.PrayerRequest
		err := rows.Scan(&pr.ID, &pr.AuthorID, &pr.Title, &pr.Body, &pr.Category, &pr.Visibility, &pr.AllowAnonymous, &pr.Status, &pr.PrayedCount, &pr.CreatedAt, &pr.UpdatedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, pr)
	}
	return items, rows.Err()
}

var _ Repository = (*PostgresRepository)(nil)
var _ = pgx.ErrNoRows
