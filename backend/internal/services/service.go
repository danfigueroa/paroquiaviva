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
var ErrInvalidPrayerActionType = errors.New("invalid prayer action type")

func NewService(repo repositories.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context, userID string) (models.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID, displayName, username string, avatarURL *string) (models.User, error) {
	displayName = strings.TrimSpace(displayName)
	username = normalizeUsername(username)
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

func (s *Service) IsUsernameAvailable(ctx context.Context, username string) (bool, error) {
	username = normalizeUsername(username)
	if len(username) < 3 || len(username) > 30 {
		return false, ErrInvalidUsername
	}
	matched, _ := regexp.MatchString(`^[a-z0-9_]+$`, username)
	if !matched {
		return false, ErrInvalidUsername
	}
	exists, err := s.repo.UsernameExists(ctx, username)
	if err != nil {
		return false, err
	}
	return !exists, nil
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
	if !isValidPrayerCategory(in.Category) {
		return models.PrayerRequest{}, ErrInvalidCategory
	}
	if !isValidVisibility(in.Visibility) {
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

func (s *Service) UpdatePrayerRequest(ctx context.Context, in models.UpdatePrayerRequestInput) (models.PrayerRequest, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	if len(in.Title) < 3 || len(in.Title) > 120 {
		return models.PrayerRequest{}, ErrInvalidTitle
	}
	if len(in.Body) < 10 || len(in.Body) > 4000 {
		return models.PrayerRequest{}, ErrInvalidBody
	}
	if !isValidPrayerCategory(in.Category) {
		return models.PrayerRequest{}, ErrInvalidCategory
	}
	if !isValidVisibility(in.Visibility) {
		return models.PrayerRequest{}, ErrInvalidVisibility
	}
	if in.Visibility == models.VisibilityGroupOnly && len(in.GroupIDs) == 0 {
		return models.PrayerRequest{}, ErrGroupIDsRequired
	}
	if in.Visibility == models.VisibilityPrivate && len(in.GroupIDs) > 0 {
		return models.PrayerRequest{}, ErrPrivateCannotHaveGroups
	}
	return s.repo.UpdatePrayerRequest(ctx, in)
}

func (s *Service) DeletePrayerRequest(ctx context.Context, userID, requestID string) error {
	return s.repo.DeletePrayerRequest(ctx, userID, requestID)
}

func (s *Service) GetPrayerRequestByID(ctx context.Context, userID, requestID string) (models.PrayerRequest, error) {
	return s.repo.GetPrayerRequestByID(ctx, userID, requestID)
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

func (s *Service) CountPublicPrayerRequests(ctx context.Context) (int64, error) {
	return s.repo.CountPublicPrayerRequests(ctx)
}

func (s *Service) RecordPrayerAction(ctx context.Context, userID, requestID string, actionType models.PrayerActionType, windowHours int) error {
	if windowHours < 1 {
		windowHours = 12
	}
	if !isValidPrayerActionType(actionType) {
		return ErrInvalidPrayerActionType
	}
	return s.repo.RecordPrayerAction(ctx, userID, requestID, actionType, windowHours)
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

func (s *Service) CountHomePrayerRequests(ctx context.Context, userID string) (int64, error) {
	return s.repo.CountHomePrayerRequests(ctx, userID)
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

func (s *Service) CountGroupsPrayerRequests(ctx context.Context, userID string) (int64, error) {
	return s.repo.CountGroupsPrayerRequests(ctx, userID)
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

func (s *Service) CountFriendsPrayerRequests(ctx context.Context, userID string) (int64, error) {
	return s.repo.CountFriendsPrayerRequests(ctx, userID)
}

func (s *Service) ListUserGroups(ctx context.Context, userID string) ([]models.Group, error) {
	return s.repo.ListUserGroups(ctx, userID)
}

func (s *Service) SearchGroupsByName(ctx context.Context, userID, query string, limit int) ([]models.GroupSummary, error) {
	query = strings.TrimSpace(strings.TrimPrefix(query, "@"))
	if query == "" {
		return []models.GroupSummary{}, nil
	}
	return s.repo.SearchGroupsByName(ctx, userID, query, limit)
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

func (s *Service) EnsureAuthUser(ctx context.Context, userID, email, preferredUsername, preferredDisplayName string) error {
	if strings.TrimSpace(email) == "" && strings.TrimSpace(userID) != "" {
		email = userID + "@auth.local"
	}
	preferredUsername = normalizeUsername(preferredUsername)
	preferredDisplayName = strings.TrimSpace(preferredDisplayName)
	return s.repo.UpsertAuthUser(ctx, userID, email, preferredUsername, preferredDisplayName)
}

func normalizeUsername(value string) string {
	return strings.TrimSpace(strings.TrimPrefix(strings.ToLower(value), "@"))
}

func isValidPrayerCategory(category models.PrayerCategory) bool {
	switch category {
	case models.CategoryHealth, models.CategoryFamily, models.CategoryWork, models.CategoryGrief, models.CategoryThanksgiving, models.CategoryOther:
		return true
	default:
		return false
	}
}

func isValidVisibility(visibility models.Visibility) bool {
	switch visibility {
	case models.VisibilityPublic, models.VisibilityGroupOnly, models.VisibilityPrivate:
		return true
	default:
		return false
	}
}

func isValidPrayerActionType(actionType models.PrayerActionType) bool {
	switch actionType {
	case models.PrayerActionHailMary, models.PrayerActionOurFather, models.PrayerActionGloryBe, models.PrayerActionRosaryDecade, models.PrayerActionRosaryFull:
		return true
	default:
		return false
	}
}
