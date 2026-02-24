package models

import "time"

type Visibility string

type PrayerCategory string

type PrayerStatus string

type GroupJoinPolicy string

type GroupRole string

type ModerationActionType string

const (
	VisibilityPublic    Visibility = "PUBLIC"
	VisibilityGroupOnly Visibility = "GROUP_ONLY"
	VisibilityPrivate   Visibility = "PRIVATE"
)

const (
	CategoryHealth       PrayerCategory = "HEALTH"
	CategoryFamily       PrayerCategory = "FAMILY"
	CategoryWork         PrayerCategory = "WORK"
	CategoryGrief        PrayerCategory = "GRIEF"
	CategoryThanksgiving PrayerCategory = "THANKSGIVING"
	CategoryOther        PrayerCategory = "OTHER"
)

const (
	StatusPendingReview PrayerStatus = "PENDING_REVIEW"
	StatusActive        PrayerStatus = "ACTIVE"
	StatusClosed        PrayerStatus = "CLOSED"
	StatusArchived      PrayerStatus = "ARCHIVED"
	StatusRemoved       PrayerStatus = "REMOVED"
)

const (
	JoinPolicyOpen       GroupJoinPolicy = "OPEN"
	JoinPolicyRequest    GroupJoinPolicy = "REQUEST"
	JoinPolicyInviteOnly GroupJoinPolicy = "INVITE_ONLY"
)

const (
	RoleMember    GroupRole = "MEMBER"
	RoleModerator GroupRole = "MODERATOR"
	RoleAdmin     GroupRole = "ADMIN"
)

const (
	ActionApprove        ModerationActionType = "APPROVE"
	ActionReject         ModerationActionType = "REJECT"
	ActionRequestChanges ModerationActionType = "REQUEST_CHANGES"
	ActionRemove         ModerationActionType = "REMOVE"
	ActionBan            ModerationActionType = "BAN"
)

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type PrayerRequest struct {
	ID             string         `json:"id"`
	AuthorID       string         `json:"authorId"`
	Title          string         `json:"title"`
	Body           string         `json:"body"`
	Category       PrayerCategory `json:"category"`
	Visibility     Visibility     `json:"visibility"`
	AllowAnonymous bool           `json:"allowAnonymous"`
	Status         PrayerStatus   `json:"status"`
	PrayedCount    int64          `json:"prayedCount"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

type CreatePrayerRequestInput struct {
	AuthorID       string
	Title          string
	Body           string
	Category       PrayerCategory
	Visibility     Visibility
	AllowAnonymous bool
	GroupIDs       []string
}
