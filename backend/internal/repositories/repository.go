package repositories

import (
	"context"
	"errors"
	"strings"

	"parish-viva/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicatePrayedAction = errors.New("duplicate prayed action")
var ErrInviteOnlyGroup = errors.New("invite only group")
var ErrGroupAdminRequired = errors.New("group admin required")
var ErrJoinRequestNotFound = errors.New("join request not found")
var ErrFriendUserNotFound = errors.New("friend user not found")
var ErrCannotAddSelf = errors.New("cannot add self")
var ErrFriendRequestAlreadyExists = errors.New("friend request already exists")
var ErrFriendRequestNotFound = errors.New("friend request not found")
var ErrUsernameTaken = errors.New("username already in use")
var ErrGroupAccessDenied = errors.New("group access denied")

type Repository interface {
	GetUserByID(ctx context.Context, userID string) (models.User, error)
	UpdateUserProfile(ctx context.Context, userID, displayName, username string, avatarURL *string) (models.User, error)
	UpsertAuthUser(ctx context.Context, userID, email string) error
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
	SendFriendRequest(ctx context.Context, fromUserID, targetUsername string) error
	ListFriends(ctx context.Context, userID string) ([]models.Friend, error)
	ListPendingFriendRequests(ctx context.Context, userID string) ([]models.FriendRequest, error)
	AcceptFriendRequest(ctx context.Context, userID, requestID string) error
	SearchUsersForFriendship(ctx context.Context, userID, query string, limit int) ([]models.UserSummary, error)
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
		SELECT id::text, email, username, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`, userID).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *PostgresRepository) UpdateUserProfile(ctx context.Context, userID, displayName, username string, avatarURL *string) (models.User, error) {
	var u models.User
	err := r.db.QueryRow(ctx, `
		UPDATE users
		SET display_name = $2, username = $3, avatar_url = $4, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id::text, email, username, display_name, avatar_url, created_at, updated_at
	`, userID, displayName, username, avatarURL).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" && strings.Contains(pgErr.ConstraintName, "username") {
			return models.User{}, ErrUsernameTaken
		}
	}
	return u, err
}

func (r *PostgresRepository) UpsertAuthUser(ctx context.Context, userID, email string) error {
	if userID == "" || email == "" {
		return nil
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO users (id, email, username, display_name)
		VALUES ($1, $2, 'user_' || SUBSTRING($1::text, 1, 8), SPLIT_PART($2, '@', 1))
		ON CONFLICT (id) DO UPDATE
		SET email = EXCLUDED.email, updated_at = NOW()
	`, userID, email)
	return err
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
		var canPost bool
		err = tx.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1
				FROM group_memberships gm
				WHERE gm.group_id = $1
				  AND gm.user_id = $2
				  AND gm.deleted_at IS NULL
			)
		`, groupID, in.AuthorID).Scan(&canPost)
		if err != nil {
			return models.PrayerRequest{}, err
		}
		if !canPost {
			return models.PrayerRequest{}, ErrGroupAccessDenied
		}

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
			WHERE pr.author_id = $1
			  AND pr.status IN ('ACTIVE', 'PENDING_REVIEW')
			  AND pr.deleted_at IS NULL
			UNION
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

func (r *PostgresRepository) SendFriendRequest(ctx context.Context, fromUserID, targetUsername string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var targetUserID string
	err = tx.QueryRow(ctx, `
		SELECT id::text
		FROM users
		WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL
	`, targetUsername).Scan(&targetUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFriendUserNotFound
		}
		return err
	}
	if targetUserID == fromUserID {
		return ErrCannotAddSelf
	}

	var existingStatus string
	err = tx.QueryRow(ctx, `
		SELECT status
		FROM friendships
		WHERE (user_id = $1 AND friend_user_id = $2)
		   OR (user_id = $2 AND friend_user_id = $1)
		LIMIT 1
	`, fromUserID, targetUserID).Scan(&existingStatus)
	if err == nil {
		return ErrFriendRequestAlreadyExists
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO friendships (user_id, friend_user_id, status)
		VALUES ($1, $2, 'PENDING')
	`, fromUserID, targetUserID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) ListFriends(ctx context.Context, userID string) ([]models.Friend, error) {
	rows, err := r.db.Query(ctx, `
		WITH friend_pairs AS (
			SELECT
				CASE WHEN user_id = $1 THEN friend_user_id ELSE user_id END AS friend_id,
				updated_at
			FROM friendships
			WHERE status = 'ACCEPTED'
			  AND (user_id = $1 OR friend_user_id = $1)
		)
		SELECT u.id::text, u.username, u.display_name, u.avatar_url, fp.updated_at
		FROM friend_pairs fp
		INNER JOIN users u ON u.id = fp.friend_id
		WHERE u.deleted_at IS NULL
		ORDER BY fp.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Friend, 0)
	for rows.Next() {
		var item models.Friend
		err = rows.Scan(&item.UserID, &item.Username, &item.DisplayName, &item.AvatarURL, &item.ConnectedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) ListPendingFriendRequests(ctx context.Context, userID string) ([]models.FriendRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT f.id::text, u.id::text, u.username, u.display_name, f.created_at
		FROM friendships f
		INNER JOIN users u ON u.id = f.user_id
		WHERE f.friend_user_id = $1
		  AND f.status = 'PENDING'
		  AND u.deleted_at IS NULL
		ORDER BY f.created_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.FriendRequest, 0)
	for rows.Next() {
		var item models.FriendRequest
		err = rows.Scan(&item.ID, &item.FromUserID, &item.Username, &item.DisplayName, &item.RequestedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) AcceptFriendRequest(ctx context.Context, userID, requestID string) error {
	ct, err := r.db.Exec(ctx, `
		UPDATE friendships
		SET status = 'ACCEPTED', updated_at = NOW()
		WHERE id = $1
		  AND friend_user_id = $2
		  AND status = 'PENDING'
	`, requestID, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrFriendRequestNotFound
	}
	return nil
}

func (r *PostgresRepository) SearchUsersForFriendship(ctx context.Context, userID, query string, limit int) ([]models.UserSummary, error) {
	if limit <= 0 || limit > 30 {
		limit = 20
	}
	rows, err := r.db.Query(ctx, `
		SELECT u.id::text, u.username, u.display_name, u.avatar_url
		FROM users u
		WHERE u.id <> $1
		  AND u.deleted_at IS NULL
		  AND (
			  u.username ILIKE $2 || '%'
			  OR u.display_name ILIKE '%' || $2 || '%'
		  )
		  AND NOT EXISTS (
			  SELECT 1
			  FROM friendships f
			  WHERE (f.user_id = $1 AND f.friend_user_id = u.id)
			     OR (f.user_id = u.id AND f.friend_user_id = $1)
		  )
		ORDER BY u.display_name ASC
		LIMIT $3
	`, userID, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.UserSummary, 0)
	for rows.Next() {
		var item models.UserSummary
		err = rows.Scan(&item.UserID, &item.Username, &item.DisplayName, &item.AvatarURL)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

var _ Repository = (*PostgresRepository)(nil)
var _ = pgx.ErrNoRows
