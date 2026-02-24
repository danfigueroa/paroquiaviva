package services

import (
	"context"
	"errors"
	"strings"

	"parish-viva/backend/internal/models"
	"parish-viva/backend/internal/repositories"
)

type Service struct {
	repo repositories.Repository
}

var ErrInvalidDisplayName = errors.New("invalid displayName")
var ErrInvalidTitle = errors.New("invalid title")
var ErrInvalidBody = errors.New("invalid body")
var ErrGroupIDsRequired = errors.New("groupIds required for GROUP_ONLY")
var ErrPrivateCannotHaveGroups = errors.New("PRIVATE requests cannot include groupIds")

func NewService(repo repositories.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context, userID string) (models.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID, displayName string, avatarURL *string) (models.User, error) {
	displayName = strings.TrimSpace(displayName)
	if len(displayName) < 2 || len(displayName) > 80 {
		return models.User{}, ErrInvalidDisplayName
	}
	return s.repo.UpdateUserProfile(ctx, userID, displayName, avatarURL)
}

func (s *Service) CreatePrayerRequest(ctx context.Context, in models.CreatePrayerRequestInput) (models.PrayerRequest, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	if len(in.Title) < 3 || len(in.Title) > 120 {
		return models.PrayerRequest{}, ErrInvalidTitle
	}
	if len(in.Body) < 10 || len(in.Body) > 4000 {
		return models.PrayerRequest{}, ErrInvalidBody
	}
	if in.Visibility == models.VisibilityGroupOnly && len(in.GroupIDs) == 0 {
		return models.PrayerRequest{}, ErrGroupIDsRequired
	}
	if in.Visibility == models.VisibilityPrivate && len(in.GroupIDs) > 0 {
		return models.PrayerRequest{}, ErrPrivateCannotHaveGroups
	}
	return s.repo.CreatePrayerRequest(ctx, in)
}

func (s *Service) ListPublicPrayerRequests(ctx context.Context, limit, offset int) ([]models.PrayerRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListPublicPrayerRequests(ctx, limit, offset)
}

func (s *Service) RecordPrayedAction(ctx context.Context, userID, requestID string, windowHours int) error {
	if windowHours < 1 {
		windowHours = 12
	}
	return s.repo.RecordPrayedAction(ctx, userID, requestID, windowHours)
}
