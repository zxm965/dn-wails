package dn

import "dn-wails/internal/account"

const CurrentVersion = 2

const (
	UserRoleMember = account.UserRoleMember
	UserRoleAdmin  = account.UserRoleAdmin

	UserStatusDisabled = account.UserStatusDisabled
	UserStatusEnabled  = account.UserStatusEnabled

	MessageLevelInfo    = "info"
	MessageLevelSuccess = "success"
	MessageLevelWarning = "warning"
	MessageLevelError   = "error"

	MessageTargetSelf  = "_self"
	MessageTargetBlank = "_blank"
)

type Profile = account.Profile
type AuthState = account.AuthState
type RegistrationInput = account.RegistrationInput
type LoginInput = account.LoginInput
type PasswordInput = account.PasswordInput
type ProfileInput = account.ProfileInput

type RoleProfession struct {
	ID              int    `json:"id"`
	OwnerID         int    `json:"ownerId"`
	RoleName        string `json:"roleName"`
	Profession      string `json:"profession"`
	Priority        int    `json:"priority"`
	Remark          string `json:"remark"`
	SortOrder       int    `json:"sortOrder"`
	WeeklyPlanCount int    `json:"weeklyPlanCount"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
	DeletedAt       string `json:"deletedAt"`
}

type RoleProfessionInput struct {
	ID         int    `json:"id"`
	RoleName   string `json:"roleName"`
	Profession string `json:"profession"`
	Priority   int    `json:"priority"`
	Remark     string `json:"remark"`
	SortOrder  int    `json:"sortOrder"`
}

type RoleProfessionQuery struct {
	RoleName   string `json:"roleName"`
	Profession string `json:"profession"`
	Priority   int    `json:"priority"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
}

type WeeklyPlanCommission struct {
	ID        int  `json:"id"`
	Completed bool `json:"completed"`
}

type WeeklyPlanTicket struct {
	ID        int    `json:"id"`
	ExpiresAt string `json:"expiresAt"`
}

type WeeklyPlan struct {
	ID                   int                    `json:"id"`
	OwnerID              int                    `json:"ownerId"`
	RoleName             string                 `json:"roleName"`
	Profession           string                 `json:"profession"`
	Priority             int                    `json:"priority"`
	NestCommissions      []WeeklyPlanCommission `json:"nestCommissions"`
	NestTickets          []WeeklyPlanTicket     `json:"nestTickets"`
	LevelCommissionCount int                    `json:"levelCommissionCount"`
	HasInvasion          bool                   `json:"hasInvasion"`
	HasArk               bool                   `json:"hasArk"`
	HasNightmare         bool                   `json:"hasNightmare"`
	Remark               string                 `json:"remark"`
	SortOrder            int                    `json:"sortOrder"`
	RoleProfessionID     int                    `json:"roleProfessionId"`
	CreatedAt            string                 `json:"createdAt"`
	UpdatedAt            string                 `json:"updatedAt"`
}

type WeeklyPlanInput struct {
	ID                   int                    `json:"id"`
	RoleProfessionID     int                    `json:"roleProfessionId"`
	NestCommissions      []WeeklyPlanCommission `json:"nestCommissions"`
	NestTickets          []WeeklyPlanTicket     `json:"nestTickets"`
	LevelCommissionCount int                    `json:"levelCommissionCount"`
	HasInvasion          bool                   `json:"hasInvasion"`
	HasArk               bool                   `json:"hasArk"`
	HasNightmare         bool                   `json:"hasNightmare"`
	Remark               string                 `json:"remark"`
	SortOrder            int                    `json:"sortOrder"`
}

type WeeklyPlanQuery struct {
	RoleName         string `json:"roleName"`
	Profession       string `json:"profession"`
	Priority         int    `json:"priority"`
	NestCommission   string `json:"nestCommission"`
	RoleProfessionID int    `json:"roleProfessionId"`
	Page             int    `json:"page"`
	PageSize         int    `json:"pageSize"`
}

type SiteMessage struct {
	ID           int                  `json:"id"`
	Source       string               `json:"source"`
	SourceKey    string               `json:"sourceKey"`
	Level        string               `json:"level"`
	Title        string               `json:"title"`
	Content      string               `json:"content"`
	ActionLabel  string               `json:"actionLabel"`
	ActionURL    string               `json:"actionUrl"`
	ActionTarget string               `json:"actionTarget"`
	Popup        bool                 `json:"popup"`
	Status       int                  `json:"status"`
	PublishedAt  string               `json:"publishedAt"`
	ExpiresAt    string               `json:"expiresAt"`
	CreatedBy    int                  `json:"createdBy"`
	Metadata     *SiteMessageMetadata `json:"metadata,omitempty"`
	ReadAt       string               `json:"readAt,omitempty"`
	IsRead       bool                 `json:"isRead,omitempty"`
}

type SiteMessageMetadata struct {
	CategoryCode string `json:"categoryCode"`
	IsTop        bool   `json:"isTop"`
	IsHot        bool   `json:"isHot"`
	SourceID     int    `json:"sourceId"`
}

type SiteMessageInput struct {
	Level        string `json:"level"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	ActionLabel  string `json:"actionLabel"`
	ActionURL    string `json:"actionUrl"`
	ActionTarget string `json:"actionTarget"`
	Popup        bool   `json:"popup"`
	PublishedAt  string `json:"publishedAt"`
	ExpiresAt    string `json:"expiresAt"`
}

type SiteMessageQuery struct {
	Keyword    string `json:"keyword"`
	ReadStatus string `json:"readStatus"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
}

type ListMeta struct {
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
}

type RoleProfessionList struct {
	Items []RoleProfession `json:"items"`
	Meta  ListMeta         `json:"meta"`
}

type WeeklyPlanList struct {
	Items []WeeklyPlan `json:"items"`
	Meta  ListMeta     `json:"meta"`
}

type SiteMessageList struct {
	Items        []SiteMessage `json:"items"`
	Meta         ListMeta      `json:"meta"`
	UnreadCount  int           `json:"unreadCount"`
	LastSyncedAt string        `json:"lastSyncedAt"`
	SyncError    string        `json:"syncError"`
}

type SiteMessageInbox struct {
	Items        []SiteMessage `json:"items"`
	UnreadCount  int           `json:"unreadCount"`
	LastSyncedAt string        `json:"lastSyncedAt"`
	SyncError    string        `json:"syncError"`
}

type SiteMessageClaim struct {
	Items []SiteMessage `json:"items"`
}

type OfficialMessageSyncResult struct {
	Skipped   bool   `json:"skipped"`
	Fetched   int    `json:"fetched"`
	Published int    `json:"published"`
	SyncedAt  string `json:"syncedAt"`
}

type WeeklyPlanInitializationResult struct {
	Count   int `json:"count"`
	Created int `json:"created"`
	Updated int `json:"updated"`
}

type WeeklyPlanSyncResult struct {
	Created int `json:"created"`
	Total   int `json:"total"`
}

type user struct {
	ID           int    `json:"id"`
	Account      string `json:"account"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	PasswordHash string `json:"passwordHash"`
	Role         int    `json:"role"`
	Status       int    `json:"status"`
	Avatar       string `json:"avatar"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type session struct {
	UserID     int    `json:"userId"`
	ExpiresAt  string `json:"expiresAt"`
	LastUsedAt string `json:"lastUsedAt"`
}

type messageReceipt struct {
	UserID     int    `json:"userId"`
	MessageID  int    `json:"messageId"`
	NotifiedAt string `json:"notifiedAt"`
	ReadAt     string `json:"readAt"`
}

type legacyMessageReceipt struct {
	MessageID int    `json:"messageId"`
	ReadAt    string `json:"readAt"`
}

type officialSyncState struct {
	LatestPublishedAt string `json:"latestPublishedAt"`
	LastSyncedAt      string `json:"lastSyncedAt"`
}

type state struct {
	Version               int                    `json:"version"`
	NextUserID            int                    `json:"nextUserId"`
	NextRoleID            int                    `json:"nextRoleId"`
	NextPlanID            int                    `json:"nextPlanId"`
	NextMessageID         int                    `json:"nextMessageId"`
	Users                 []user                 `json:"users"`
	Session               session                `json:"session"`
	Roles                 []RoleProfession       `json:"roles"`
	Plans                 []WeeklyPlan           `json:"plans"`
	Messages              []SiteMessage          `json:"messages"`
	MessageReceipts       []messageReceipt       `json:"messageReceipts"`
	OfficialSync          officialSyncState      `json:"officialSync"`
	LegacyProfile         *Profile               `json:"legacyProfile,omitempty"`
	LegacyMessageReceipts []legacyMessageReceipt `json:"legacyMessageReceipts,omitempty"`
}

type legacyState struct {
	Version       int              `json:"version"`
	NextRoleID    int              `json:"nextRoleId"`
	NextPlanID    int              `json:"nextPlanId"`
	NextMessageID int              `json:"nextMessageId"`
	Profile       Profile          `json:"profile"`
	Roles         []RoleProfession `json:"roles"`
	Plans         []WeeklyPlan     `json:"plans"`
	Messages      []SiteMessage    `json:"messages"`
}
