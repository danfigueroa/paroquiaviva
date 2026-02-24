package models

import "time"

type Visibility string

type PrayerCategory string

type PrayerStatus string
type PrayerActionType string

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
	PrayerActionHailMary     PrayerActionType = "HAIL_MARY"
	PrayerActionOurFather    PrayerActionType = "OUR_FATHER"
	PrayerActionGloryBe      PrayerActionType = "GLORY_BE"
	PrayerActionRosaryDecade PrayerActionType = "ROSARY_DECADE"
	PrayerActionRosaryFull   PrayerActionType = "ROSARY_FULL"
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
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type PrayerRequest struct {
	ID                string           `json:"id"`
	AuthorID          string           `json:"authorId"`
	AuthorUsername    string           `json:"authorUsername,omitempty"`
	AuthorDisplayName string           `json:"authorDisplayName,omitempty"`
	Title             string           `json:"title"`
	Body              string           `json:"body"`
	Category          PrayerCategory   `json:"category"`
	Visibility        Visibility       `json:"visibility"`
	AllowAnonymous    bool             `json:"allowAnonymous"`
	Status            PrayerStatus     `json:"status"`
	PrayedCount       int64            `json:"prayedCount"`
	GroupIDs          []string         `json:"groupIds,omitempty"`
	PrayerTypeCounts  map[string]int64 `json:"prayerTypeCounts,omitempty"`
	MyPrayerTypes     []string         `json:"myPrayerTypes,omitempty"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
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

type UpdatePrayerRequestInput struct {
	RequestID      string
	EditorID       string
	Title          string
	Body           string
	Category       PrayerCategory
	Visibility     Visibility
	AllowAnonymous bool
	GroupIDs       []string
}

type Group struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	Description        string          `json:"description"`
	ImageURL           *string         `json:"imageUrl,omitempty"`
	JoinPolicy         GroupJoinPolicy `json:"joinPolicy"`
	RequiresModeration bool            `json:"requiresModeration"`
	CreatedBy          string          `json:"createdBy"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
}

type GroupJoinRequest struct {
	ID          string    `json:"id"`
	GroupID     string    `json:"groupId"`
	UserID      string    `json:"userId"`
	Status      string    `json:"status"`
	RequestedAt time.Time `json:"requestedAt"`
}

type Friend struct {
	UserID      string    `json:"userId"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	ConnectedAt time.Time `json:"connectedAt"`
}

type FriendRequest struct {
	ID          string    `json:"id"`
	FromUserID  string    `json:"fromUserId"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	RequestedAt time.Time `json:"requestedAt"`
}

type UserSummary struct {
	UserID      string  `json:"userId"`
	Username    string  `json:"username"`
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl,omitempty"`
}
