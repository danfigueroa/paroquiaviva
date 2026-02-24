package repositories

import (
	"context"
	"errors"

	"parish-viva/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicatePrayedAction = errors.New("duplicate prayed action")

type Repository interface {
	GetUserByID(ctx context.Context, userID string) (models.User, error)
	UpdateUserProfile(ctx context.Context, userID, displayName string, avatarURL *string) (models.User, error)
	CreatePrayerRequest(ctx context.Context, in models.CreatePrayerRequestInput) (models.PrayerRequest, error)
	ListPublicPrayerRequests(ctx context.Context, limit, offset int) ([]models.PrayerRequest, error)
	RecordPrayedAction(ctx context.Context, userID, requestID string, windowHours int) error
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

var _ Repository = (*PostgresRepository)(nil)
var _ = pgx.ErrNoRows
