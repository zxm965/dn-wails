package dn

const (
	WeeklyCommissionTotal       = 6
	LinkedWeeklyCommissionTotal = 2
	ManualWeeklyCommissionTotal = WeeklyCommissionTotal - LinkedWeeklyCommissionTotal
)

func normalizeWeeklyCommissionCount(count int, hasArk bool, hasNightmare bool) (int, error) {
	if count < 0 || count > WeeklyCommissionTotal {
		return 0, ErrInvalidData
	}
	linkedRemaining := LinkedWeeklyCommissionTotal
	if hasArk {
		linkedRemaining--
	}
	if hasNightmare {
		linkedRemaining--
	}
	minimum := linkedRemaining
	maximum := linkedRemaining + ManualWeeklyCommissionTotal
	if count < minimum {
		return minimum, nil
	}
	if count > maximum {
		return maximum, nil
	}
	return count, nil
}

const (
	MessageLevelInfo    = "info"
	MessageLevelSuccess = "success"
	MessageLevelWarning = "warning"
	MessageLevelError   = "error"

	MessageTargetSelf  = "_self"
	MessageTargetBlank = "_blank"
)

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
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
}

type WeeklyPlan struct {
	ID                       int    `json:"id"`
	OwnerID                  int    `json:"ownerId"`
	RoleName                 string `json:"roleName"`
	Profession               string `json:"profession"`
	Priority                 int    `json:"priority"`
	RemainingCommissionCount int    `json:"remainingCommissionCount"`
	HasInvasion              bool   `json:"hasInvasion"`
	HasArk                   bool   `json:"hasArk"`
	HasNightmare             bool   `json:"hasNightmare"`
	Remark                   string `json:"remark"`
	SortOrder                int    `json:"sortOrder"`
	RoleProfessionID         int    `json:"roleProfessionId"`
	CreatedAt                string `json:"createdAt"`
	UpdatedAt                string `json:"updatedAt"`
}

type WeeklyPlanInput struct {
	ID                       int    `json:"id"`
	RoleProfessionID         int    `json:"roleProfessionId"`
	RemainingCommissionCount int    `json:"remainingCommissionCount"`
	HasInvasion              bool   `json:"hasInvasion"`
	HasArk                   bool   `json:"hasArk"`
	HasNightmare             bool   `json:"hasNightmare"`
	Remark                   string `json:"remark"`
	SortOrder                int    `json:"sortOrder"`
}

type WeeklyPlanQuery struct {
	RoleName         string `json:"roleName"`
	Profession       string `json:"profession"`
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
	Manage     bool   `json:"manage"`
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
