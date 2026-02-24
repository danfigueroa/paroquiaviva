package services

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"parish-viva/backend/internal/models"
	"parish-viva/backend/internal/repositories"
)

type Service struct {
	repo repositories.Repository
}

var ErrInvalidDisplayName = errors.New("invalid displayName")
var ErrInvalidCategory = errors.New("invalid category")
var ErrInvalidVisibility = errors.New("invalid visibility")
var ErrInvalidTitle = errors.New("invalid title")
var ErrInvalidBody = errors.New("invalid body")
var ErrGroupIDsRequired = errors.New("groupIds required for GROUP_ONLY")
var ErrPrivateCannotHaveGroups = errors.New("PRIVATE requests cannot include groupIds")
var ErrInvalidGroupName = errors.New("invalid group name")
var ErrInvalidGroupDescription = errors.New("invalid group description")
var ErrInvalidJoinPolicy = errors.New("invalid joinPolicy")
var ErrInvalidUsername = errors.New("invalid username")

func NewService(repo repositories.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context, userID string) (models.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID, displayName, username string, avatarURL *string) (models.User, error) {
	displayName = strings.TrimSpace(displayName)
	username = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(username), "@"))
	if displayName == "" {
		current, err := s.repo.GetUserByID(ctx, userID)
		if err == nil {
			displayName = current.DisplayName
		}
	}
	if len(displayName) < 2 || len(displayName) > 80 {
		return models.User{}, ErrInvalidDisplayName
	}
	if len(username) < 3 || len(username) > 30 {
		return models.User{}, ErrInvalidUsername
	}
	matched, _ := regexp.MatchString(`^[a-z0-9_]+$`, username)
	if !matched {
		return models.User{}, ErrInvalidUsername
	}
	return s.repo.UpdateUserProfile(ctx, userID, displayName, username, avatarURL)
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
	switch in.Category {
	case models.CategoryHealth, models.CategoryFamily, models.CategoryWork, models.CategoryGrief, models.CategoryThanksgiving, models.CategoryOther:
	default:
		return models.PrayerRequest{}, ErrInvalidCategory
	}
	switch in.Visibility {
	case models.VisibilityPublic, models.VisibilityGroupOnly, models.VisibilityPrivate:
	default:
		return models.PrayerRequest{}, ErrInvalidVisibility
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

func (s *Service) ListHomePrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListHomePrayerRequests(ctx, userID, limit, offset)
}

func (s *Service) ListGroupsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListGroupsPrayerRequests(ctx, userID, limit, offset)
}

func (s *Service) ListFriendsPrayerRequests(ctx context.Context, userID string, limit, offset int) ([]models.PrayerRequest, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListFriendsPrayerRequests(ctx, userID, limit, offset)
}

func (s *Service) ListUserGroups(ctx context.Context, userID string) ([]models.Group, error) {
	return s.repo.ListUserGroups(ctx, userID)
}

func (s *Service) CreateGroup(ctx context.Context, userID, name, description string, imageURL *string, joinPolicy models.GroupJoinPolicy) (models.Group, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
	if joinPolicy == "" {
		joinPolicy = models.JoinPolicyRequest
	}
	if len(name) < 3 || len(name) > 80 {
		return models.Group{}, ErrInvalidGroupName
	}
	if len(description) > 500 {
		return models.Group{}, ErrInvalidGroupDescription
	}
	switch joinPolicy {
	case models.JoinPolicyOpen, models.JoinPolicyRequest, models.JoinPolicyInviteOnly:
	default:
		return models.Group{}, ErrInvalidJoinPolicy
	}
	return s.repo.CreateGroup(ctx, userID, name, description, imageURL, joinPolicy)
}

func (s *Service) RequestJoinGroup(ctx context.Context, userID, groupID string) error {
	return s.repo.RequestJoinGroup(ctx, userID, groupID)
}

func (s *Service) ListGroupJoinRequests(ctx context.Context, actorUserID, groupID string) ([]models.GroupJoinRequest, error) {
	return s.repo.ListGroupJoinRequests(ctx, actorUserID, groupID)
}

func (s *Service) ApproveGroupJoinRequest(ctx context.Context, actorUserID, groupID, requestID string) error {
	return s.repo.ApproveGroupJoinRequest(ctx, actorUserID, groupID, requestID)
}

func (s *Service) SendFriendRequest(ctx context.Context, fromUserID, targetUsername string) error {
	targetUsername = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(targetUsername), "@"))
	if len(targetUsername) < 3 {
		return ErrInvalidUsername
	}
	return s.repo.SendFriendRequest(ctx, fromUserID, targetUsername)
}

func (s *Service) ListFriends(ctx context.Context, userID string) ([]models.Friend, error) {
	return s.repo.ListFriends(ctx, userID)
}

func (s *Service) ListPendingFriendRequests(ctx context.Context, userID string) ([]models.FriendRequest, error) {
	return s.repo.ListPendingFriendRequests(ctx, userID)
}

func (s *Service) AcceptFriendRequest(ctx context.Context, userID, requestID string) error {
	return s.repo.AcceptFriendRequest(ctx, userID, requestID)
}

func (s *Service) SearchUsersForFriendship(ctx context.Context, userID, query string, limit int) ([]models.UserSummary, error) {
	query = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(query), "@"))
	if query == "" {
		return []models.UserSummary{}, nil
	}
	return s.repo.SearchUsersForFriendship(ctx, userID, query, limit)
}

func (s *Service) EnsureAuthUser(ctx context.Context, userID, email string) error {
	if strings.TrimSpace(email) == "" && strings.TrimSpace(userID) != "" {
		email = userID + "@auth.local"
	}
	return s.repo.UpsertAuthUser(ctx, userID, email)
}
