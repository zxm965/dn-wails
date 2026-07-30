package dn

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"dn-wails/internal/storage"
)

const (
	storageKey        = "dn-system"
	defaultPageSize   = 20
	maximumPageSize   = 100
	maximumAvatarSize = 5 * 1024 * 1024
)

var (
	ErrInvalidData     = errors.New("invalid dn system data")
	ErrNotFound        = errors.New("dn system record not found")
	ErrConflict        = errors.New("dn system record conflicts with existing data")
	ErrUnauthenticated = errors.New("dn authentication required")
	ErrForbidden       = errors.New("dn operation forbidden")
)

type Service struct {
	store      storage.Store
	httpClient *http.Client

	mu     sync.RWMutex
	state  state
	syncMu sync.Mutex
}

func NewService(store storage.Store) *Service {
	return NewServiceWithHTTPClient(store, &http.Client{Timeout: 15 * time.Second})
}

func NewServiceWithHTTPClient(store storage.Store, client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &Service{store: store, httpClient: client, state: defaultState(time.Now())}
}

func (s *Service) Close() error {
	return nil
}

func (s *Service) Initialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := s.store.Load(storageKey)
	if errors.Is(err, storage.ErrNotFound) {
		next := defaultState(time.Now())
		if err := s.save(next); err != nil {
			return err
		}
		s.state = next
		return nil
	}
	if err != nil {
		return fmt.Errorf("load dn system data: %w", err)
	}

	var header struct {
		Version int `json:"version"`
	}
	if err := json.Unmarshal(data, &header); err != nil {
		return fmt.Errorf("decode dn system data header: %w", err)
	}

	var loaded state
	switch header.Version {
	case 1:
		var legacy legacyState
		if err := json.Unmarshal(data, &legacy); err != nil {
			return fmt.Errorf("decode legacy dn system data: %w", err)
		}
		loaded = migrateLegacyState(legacy)
		if err := s.save(loaded); err != nil {
			return fmt.Errorf("persist migrated dn system data: %w", err)
		}
	case CurrentVersion:
		if err := json.Unmarshal(data, &loaded); err != nil {
			return fmt.Errorf("decode dn system data: %w", err)
		}
	default:
		return fmt.Errorf("%w: unsupported version %d", ErrInvalidData, header.Version)
	}

	loaded = normalizeState(loaded)
	if err := validateState(loaded); err != nil {
		return err
	}
	s.state = cloneState(loaded)
	return nil
}

func (s *Service) ImportAvatar(path string) (string, error) {
	s.mu.RLock()
	_, err := s.authenticatedUserLocked(time.Now())
	s.mu.RUnlock()
	if err != nil {
		return "", err
	}

	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("%w: avatar path is required", ErrInvalidData)
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", fmt.Errorf("inspect avatar file: %w", err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("%w: avatar path points to a directory", ErrInvalidData)
	}
	if info.Size() > maximumAvatarSize {
		return "", fmt.Errorf("%w: avatar must not exceed 5MB", ErrInvalidData)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read avatar file: %w", err)
	}
	contentType := http.DetectContentType(data)
	switch contentType {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
	default:
		return "", fmt.Errorf("%w: unsupported avatar format %q", ErrInvalidData, contentType)
	}
	return fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data)), nil
}

func (s *Service) ListRoles(query RoleProfessionQuery) (RoleProfessionList, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return RoleProfessionList{}, err
	}

	items := make([]RoleProfession, 0, len(s.state.Roles))
	for _, item := range s.state.Roles {
		if item.OwnerID != current.ID || item.DeletedAt != "" || !matchesText(item.RoleName, query.RoleName) || !matchesText(item.Profession, query.Profession) {
			continue
		}
		if query.Priority >= 0 && item.Priority != query.Priority {
			continue
		}
		item.WeeklyPlanCount = countPlansForRole(s.state.Plans, current.ID, item.ID)
		items = append(items, item)
	}
	sortRoles(items)
	pageItems, meta := paginate(items, query.Page, query.PageSize)
	return RoleProfessionList{Items: pageItems, Meta: meta}, nil
}

func (s *Service) RoleOptions() ([]RoleProfession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return nil, err
	}
	items := activeRoles(s.state.Roles, current.ID)
	for index := range items {
		items[index].WeeklyPlanCount = countPlansForRole(s.state.Plans, current.ID, items[index].ID)
	}
	return items, nil
}

func (s *Service) SaveRole(input RoleProfessionInput) (RoleProfession, error) {
	input.RoleName = strings.TrimSpace(input.RoleName)
	input.Profession = strings.TrimSpace(input.Profession)
	input.Remark = strings.TrimSpace(input.Remark)
	if input.RoleName == "" || input.Profession == "" {
		return RoleProfession{}, fmt.Errorf("%w: role name and profession are required", ErrInvalidData)
	}
	if len([]rune(input.RoleName)) > 80 || len([]rune(input.Profession)) > 80 || len([]rune(input.Remark)) > 1000 {
		return RoleProfession{}, fmt.Errorf("%w: role field exceeds the allowed length", ErrInvalidData)
	}
	if input.Priority < 0 || input.Priority > 2 || input.SortOrder < 0 {
		return RoleProfession{}, fmt.Errorf("%w: invalid role priority or sort order", ErrInvalidData)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return RoleProfession{}, err
	}
	next := cloneState(s.state)
	for _, item := range next.Roles {
		if item.OwnerID == current.ID && item.ID != input.ID && item.DeletedAt == "" && strings.EqualFold(item.RoleName, input.RoleName) {
			return RoleProfession{}, fmt.Errorf("%w: role %q already exists", ErrConflict, input.RoleName)
		}
	}

	now := time.Now().UTC().Format(time.RFC3339Nano)
	if input.ID == 0 {
		created := RoleProfession{
			ID:         next.NextRoleID,
			OwnerID:    current.ID,
			RoleName:   input.RoleName,
			Profession: input.Profession,
			Priority:   input.Priority,
			Remark:     input.Remark,
			SortOrder:  input.SortOrder,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		next.NextRoleID++
		next.Roles = append(next.Roles, created)
		if err := s.commit(next); err != nil {
			return RoleProfession{}, err
		}
		return created, nil
	}

	roleIndex := findRoleIndex(next.Roles, current.ID, input.ID)
	if roleIndex < 0 || next.Roles[roleIndex].DeletedAt != "" {
		return RoleProfession{}, fmt.Errorf("%w: role %d", ErrNotFound, input.ID)
	}
	updated := next.Roles[roleIndex]
	updated.RoleName = input.RoleName
	updated.Profession = input.Profession
	updated.Priority = input.Priority
	updated.Remark = input.Remark
	updated.SortOrder = input.SortOrder
	updated.UpdatedAt = now
	next.Roles[roleIndex] = updated
	for index := range next.Plans {
		if next.Plans[index].OwnerID == current.ID && next.Plans[index].RoleProfessionID == updated.ID {
			next.Plans[index].RoleName = updated.RoleName
			next.Plans[index].Profession = updated.Profession
			next.Plans[index].Priority = updated.Priority
			next.Plans[index].UpdatedAt = now
		}
	}
	updated.WeeklyPlanCount = countPlansForRole(next.Plans, current.ID, updated.ID)
	if err := s.commit(next); err != nil {
		return RoleProfession{}, err
	}
	return updated, nil
}

func (s *Service) DeleteRole(id int) (RoleProfession, error) {
	if id <= 0 {
		return RoleProfession{}, fmt.Errorf("%w: invalid role id", ErrInvalidData)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return RoleProfession{}, err
	}
	next := cloneState(s.state)
	index := findRoleIndex(next.Roles, current.ID, id)
	if index < 0 || next.Roles[index].DeletedAt != "" {
		return RoleProfession{}, fmt.Errorf("%w: role %d", ErrNotFound, id)
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	deleted := next.Roles[index]
	deleted.DeletedAt = now
	deleted.UpdatedAt = now
	deleted.WeeklyPlanCount = countPlansForRole(next.Plans, current.ID, id)
	next.Roles[index] = deleted
	filteredPlans := make([]WeeklyPlan, 0, len(next.Plans))
	for _, plan := range next.Plans {
		if plan.OwnerID != current.ID || plan.RoleProfessionID != id {
			filteredPlans = append(filteredPlans, plan)
		}
	}
	next.Plans = filteredPlans
	if err := s.commit(next); err != nil {
		return RoleProfession{}, err
	}
	return deleted, nil
}

func (s *Service) ListWeeklyPlans(query WeeklyPlanQuery) (WeeklyPlanList, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return WeeklyPlanList{}, err
	}
	items := make([]WeeklyPlan, 0, len(s.state.Plans))
	for _, item := range s.state.Plans {
		if item.OwnerID != current.ID || !matchesText(item.RoleName, query.RoleName) || !matchesText(item.Profession, query.Profession) {
			continue
		}
		if query.Priority >= 0 && item.Priority != query.Priority {
			continue
		}
		if query.RoleProfessionID > 0 && item.RoleProfessionID != query.RoleProfessionID {
			continue
		}
		if !matchesNest(item.NestCommissions, query.NestCommission) {
			continue
		}
		items = append(items, clonePlan(item))
	}
	sortPlans(items)
	pageItems, meta := paginate(items, query.Page, query.PageSize)
	return WeeklyPlanList{Items: pageItems, Meta: meta}, nil
}

func (s *Service) AllWeeklyPlans() ([]WeeklyPlan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return nil, err
	}
	items := make([]WeeklyPlan, 0, len(s.state.Plans))
	for _, item := range s.state.Plans {
		if item.OwnerID == current.ID {
			items = append(items, clonePlan(item))
		}
	}
	sortPlans(items)
	return items, nil
}

func (s *Service) SaveWeeklyPlan(input WeeklyPlanInput) (WeeklyPlan, error) {
	input.Remark = strings.TrimSpace(input.Remark)
	if input.RoleProfessionID <= 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: role profession is required", ErrInvalidData)
	}
	if input.LevelCommissionCount < 0 || input.LevelCommissionCount > 1 || input.SortOrder < 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: invalid weekly plan counters", ErrInvalidData)
	}
	commissions, err := normalizeCommissions(input.NestCommissions)
	if err != nil {
		return WeeklyPlan{}, err
	}
	tickets, err := normalizeTickets(input.NestTickets)
	if err != nil {
		return WeeklyPlan{}, err
	}
	if len([]rune(input.Remark)) > 1000 {
		return WeeklyPlan{}, fmt.Errorf("%w: weekly plan remark is too long", ErrInvalidData)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return WeeklyPlan{}, err
	}
	next := cloneState(s.state)
	roleIndex := findRoleIndex(next.Roles, current.ID, input.RoleProfessionID)
	if roleIndex < 0 || next.Roles[roleIndex].DeletedAt != "" {
		return WeeklyPlan{}, fmt.Errorf("%w: role profession %d", ErrNotFound, input.RoleProfessionID)
	}
	role := next.Roles[roleIndex]
	now := time.Now().UTC().Format(time.RFC3339Nano)
	value := WeeklyPlan{
		ID:                   input.ID,
		OwnerID:              current.ID,
		RoleName:             role.RoleName,
		Profession:           role.Profession,
		Priority:             role.Priority,
		NestCommissions:      commissions,
		NestTickets:          tickets,
		LevelCommissionCount: input.LevelCommissionCount,
		HasInvasion:          input.HasInvasion,
		HasArk:               input.HasArk,
		HasNightmare:         input.HasNightmare,
		Remark:               input.Remark,
		SortOrder:            input.SortOrder,
		RoleProfessionID:     role.ID,
		UpdatedAt:            now,
	}
	if input.ID == 0 {
		value.ID = next.NextPlanID
		value.CreatedAt = now
		next.NextPlanID++
		next.Plans = append(next.Plans, value)
	} else {
		planIndex := findPlanIndex(next.Plans, current.ID, input.ID)
		if planIndex < 0 {
			return WeeklyPlan{}, fmt.Errorf("%w: weekly plan %d", ErrNotFound, input.ID)
		}
		value.CreatedAt = next.Plans[planIndex].CreatedAt
		next.Plans[planIndex] = value
	}
	if err := s.commit(next); err != nil {
		return WeeklyPlan{}, err
	}
	return clonePlan(value), nil
}

func (s *Service) DeleteWeeklyPlan(id int) (WeeklyPlan, error) {
	if id <= 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: invalid weekly plan id", ErrInvalidData)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return WeeklyPlan{}, err
	}
	next := cloneState(s.state)
	index := findPlanIndex(next.Plans, current.ID, id)
	if index < 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: weekly plan %d", ErrNotFound, id)
	}
	deleted := clonePlan(next.Plans[index])
	next.Plans = append(next.Plans[:index], next.Plans[index+1:]...)
	if err := s.commit(next); err != nil {
		return WeeklyPlan{}, err
	}
	return deleted, nil
}

func (s *Service) InitializeWeeklyPlans() (WeeklyPlanInitializationResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return WeeklyPlanInitializationResult{}, err
	}
	next := cloneState(s.state)
	roles := activeRoles(next.Roles, current.ID)
	if len(roles) == 0 {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("%w: create at least one role first", ErrInvalidData)
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	result := WeeklyPlanInitializationResult{Count: len(roles)}
	for _, role := range roles {
		planIndex := findFirstPlanForRole(next.Plans, current.ID, role.ID)
		if planIndex >= 0 {
			plan := next.Plans[planIndex]
			plan.RoleName = role.RoleName
			plan.Profession = role.Profession
			plan.Priority = role.Priority
			plan.SortOrder = role.SortOrder
			plan.NestCommissions = []WeeklyPlanCommission{}
			plan.NestTickets = []WeeklyPlanTicket{}
			plan.LevelCommissionCount = 0
			plan.HasInvasion = false
			plan.HasArk = false
			plan.HasNightmare = false
			plan.UpdatedAt = now
			next.Plans[planIndex] = plan
			result.Updated++
			continue
		}
		next.Plans = append(next.Plans, WeeklyPlan{
			ID:               next.NextPlanID,
			OwnerID:          current.ID,
			RoleName:         role.RoleName,
			Profession:       role.Profession,
			Priority:         role.Priority,
			NestCommissions:  []WeeklyPlanCommission{},
			NestTickets:      []WeeklyPlanTicket{},
			SortOrder:        role.SortOrder,
			RoleProfessionID: role.ID,
			CreatedAt:        now,
			UpdatedAt:        now,
		})
		next.NextPlanID++
		result.Created++
	}
	if err := s.commit(next); err != nil {
		return WeeklyPlanInitializationResult{}, err
	}
	return result, nil
}

func (s *Service) SyncWeeklyPlans() (WeeklyPlanSyncResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return WeeklyPlanSyncResult{}, err
	}
	next := cloneState(s.state)
	roles := activeRoles(next.Roles, current.ID)
	if len(roles) == 0 {
		return WeeklyPlanSyncResult{}, fmt.Errorf("%w: create at least one role first", ErrInvalidData)
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	result := WeeklyPlanSyncResult{Total: len(roles)}
	for _, role := range roles {
		if findFirstPlanForRole(next.Plans, current.ID, role.ID) >= 0 {
			continue
		}
		next.Plans = append(next.Plans, WeeklyPlan{
			ID:               next.NextPlanID,
			OwnerID:          current.ID,
			RoleName:         role.RoleName,
			Profession:       role.Profession,
			Priority:         role.Priority,
			NestCommissions:  []WeeklyPlanCommission{},
			NestTickets:      []WeeklyPlanTicket{},
			SortOrder:        role.SortOrder,
			RoleProfessionID: role.ID,
			CreatedAt:        now,
			UpdatedAt:        now,
		})
		next.NextPlanID++
		result.Created++
	}
	if err := s.commit(next); err != nil {
		return WeeklyPlanSyncResult{}, err
	}
	return result, nil
}

func (s *Service) ListMessages(query SiteMessageQuery) (SiteMessageList, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return SiteMessageList{}, err
	}
	result := buildMessageList(s.state, current.ID, query, time.Now())
	result.LastSyncedAt = s.state.OfficialSync.LastSyncedAt
	return result, nil
}

func (s *Service) MessageInbox(limit int) (SiteMessageInbox, error) {
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}
	syncError := ""
	if _, err := s.syncOfficialMessages(false); err != nil {
		if errors.Is(err, ErrUnauthenticated) {
			return SiteMessageInbox{}, err
		}
		syncError = err.Error()
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return SiteMessageInbox{}, err
	}
	items, unread := unreadMessages(s.state, current.ID, time.Now())
	if len(items) > limit {
		items = items[:limit]
	}
	return SiteMessageInbox{
		Items:        items,
		UnreadCount:  unread,
		LastSyncedAt: s.state.OfficialSync.LastSyncedAt,
		SyncError:    syncError,
	}, nil
}

func (s *Service) ClaimMessageNotifications(limit int) (SiteMessageClaim, error) {
	if limit <= 0 {
		limit = 3
	}
	if limit > 20 {
		limit = 20
	}
	_, _ = s.syncOfficialMessages(false)

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return SiteMessageClaim{}, err
	}
	next := cloneState(s.state)
	now := time.Now()
	candidates := make([]SiteMessage, 0)
	for _, item := range next.Messages {
		if !item.Popup || !isMessageActive(item, now) {
			continue
		}
		receipt := findReceipt(next.MessageReceipts, current.ID, item.ID)
		if receipt != nil && (receipt.NotifiedAt != "" || receipt.ReadAt != "") {
			continue
		}
		candidates = append(candidates, withReceipt(item, receipt))
	}
	sortMessages(candidates)
	if len(candidates) > 50 {
		candidates = candidates[:50]
	}
	if len(candidates) == 0 {
		return SiteMessageClaim{Items: []SiteMessage{}}, nil
	}
	timestamp := now.UTC().Format(time.RFC3339Nano)
	for _, item := range candidates {
		setReceipt(&next, messageReceipt{UserID: current.ID, MessageID: item.ID, NotifiedAt: timestamp})
	}
	if err := s.commit(next); err != nil {
		return SiteMessageClaim{}, err
	}
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}
	return SiteMessageClaim{Items: candidates}, nil
}

func (s *Service) MarkMessageRead(id int) (SiteMessage, error) {
	if id <= 0 {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message id", ErrInvalidData)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return SiteMessage{}, err
	}
	next := cloneState(s.state)
	index := findMessageIndex(next.Messages, id)
	if index < 0 || !isMessageActive(next.Messages[index], time.Now()) {
		return SiteMessage{}, fmt.Errorf("%w: site message %d", ErrNotFound, id)
	}
	receipt := findReceipt(next.MessageReceipts, current.ID, id)
	now := time.Now().UTC().Format(time.RFC3339Nano)
	nextReceipt := messageReceipt{UserID: current.ID, MessageID: id, NotifiedAt: now, ReadAt: now}
	if receipt != nil && receipt.NotifiedAt != "" {
		nextReceipt.NotifiedAt = receipt.NotifiedAt
	}
	setReceipt(&next, nextReceipt)
	if err := s.commit(next); err != nil {
		return SiteMessage{}, err
	}
	return withReceipt(next.Messages[index], &nextReceipt), nil
}

func (s *Service) MarkAllMessagesRead() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return 0, err
	}
	next := cloneState(s.state)
	now := time.Now()
	timestamp := now.UTC().Format(time.RFC3339Nano)
	count := 0
	for _, item := range next.Messages {
		if !isMessageActive(item, now) {
			continue
		}
		receipt := findReceipt(next.MessageReceipts, current.ID, item.ID)
		if receipt != nil && receipt.ReadAt != "" {
			continue
		}
		notifiedAt := timestamp
		if receipt != nil && receipt.NotifiedAt != "" {
			notifiedAt = receipt.NotifiedAt
		}
		setReceipt(&next, messageReceipt{UserID: current.ID, MessageID: item.ID, NotifiedAt: notifiedAt, ReadAt: timestamp})
		count++
	}
	if count == 0 {
		return 0, nil
	}
	if err := s.commit(next); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Service) PublishMessage(input SiteMessageInput) (SiteMessage, error) {
	input.Level = strings.TrimSpace(input.Level)
	input.Title = strings.TrimSpace(input.Title)
	input.Content = strings.TrimSpace(input.Content)
	input.ActionLabel = strings.TrimSpace(input.ActionLabel)
	input.ActionURL = strings.TrimSpace(input.ActionURL)
	input.ActionTarget = strings.TrimSpace(input.ActionTarget)
	input.PublishedAt = strings.TrimSpace(input.PublishedAt)
	input.ExpiresAt = strings.TrimSpace(input.ExpiresAt)
	if input.Title == "" || len([]rune(input.Title)) > 200 || len([]rune(input.Content)) > 5000 {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message title or content", ErrInvalidData)
	}
	if len([]rune(input.ActionLabel)) > 30 || len([]rune(input.ActionURL)) > 2048 {
		return SiteMessage{}, fmt.Errorf("%w: site message action is too long", ErrInvalidData)
	}
	if !containsString([]string{MessageLevelInfo, MessageLevelSuccess, MessageLevelWarning, MessageLevelError}, input.Level) {
		return SiteMessage{}, fmt.Errorf("%w: unsupported site message level", ErrInvalidData)
	}
	if input.ActionTarget == "" {
		input.ActionTarget = MessageTargetSelf
	}
	if !containsString([]string{MessageTargetSelf, MessageTargetBlank}, input.ActionTarget) {
		return SiteMessage{}, fmt.Errorf("%w: unsupported site message target", ErrInvalidData)
	}
	if err := validateActionURL(input.ActionURL); err != nil {
		return SiteMessage{}, err
	}
	publishedAt, err := normalizeRFC3339(input.PublishedAt, time.Now())
	if err != nil {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message publish time", ErrInvalidData)
	}
	expiresAt := ""
	if input.ExpiresAt != "" {
		expiresAt, err = normalizeRFC3339(input.ExpiresAt, time.Time{})
		if err != nil {
			return SiteMessage{}, fmt.Errorf("%w: invalid site message expiry", ErrInvalidData)
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.adminUserLocked(time.Now())
	if err != nil {
		return SiteMessage{}, err
	}
	next := cloneState(s.state)
	created := SiteMessage{
		ID:           next.NextMessageID,
		Source:       "desktop",
		Level:        input.Level,
		Title:        input.Title,
		Content:      input.Content,
		ActionLabel:  input.ActionLabel,
		ActionURL:    input.ActionURL,
		ActionTarget: input.ActionTarget,
		Popup:        input.Popup,
		Status:       1,
		PublishedAt:  publishedAt,
		ExpiresAt:    expiresAt,
		CreatedBy:    current.ID,
	}
	next.NextMessageID++
	next.Messages = append(next.Messages, created)
	if err := s.commit(next); err != nil {
		return SiteMessage{}, err
	}
	return created, nil
}

func (s *Service) commit(next state) error {
	if err := s.save(next); err != nil {
		return err
	}
	s.state = cloneState(next)
	return nil
}

func (s *Service) save(next state) error {
	data, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		return fmt.Errorf("encode dn system data: %w", err)
	}
	if err := s.store.Save(storageKey, data); err != nil {
		return fmt.Errorf("persist dn system data: %w", err)
	}
	return nil
}

func defaultState(now time.Time) state {
	timestamp := now.UTC().Format(time.RFC3339Nano)
	return state{
		Version:       CurrentVersion,
		NextUserID:    1,
		NextRoleID:    1,
		NextPlanID:    1,
		NextMessageID: 2,
		Users:         []user{},
		Roles:         []RoleProfession{},
		Plans:         []WeeklyPlan{},
		Messages: []SiteMessage{{
			ID:           1,
			Source:       "desktop",
			Level:        MessageLevelInfo,
			Title:        "DN 周常管理已迁移",
			Content:      "角色、周计划、仪表盘、站内消息与账户资料现已由桌面应用的 Go 服务统一管理。",
			ActionLabel:  "查看周计划",
			ActionURL:    "/weekly-plans",
			ActionTarget: MessageTargetSelf,
			Popup:        true,
			Status:       1,
			PublishedAt:  timestamp,
		}},
		MessageReceipts: []messageReceipt{},
	}
}

func migrateLegacyState(legacy legacyState) state {
	next := state{
		Version:               CurrentVersion,
		NextUserID:            1,
		NextRoleID:            legacy.NextRoleID,
		NextPlanID:            legacy.NextPlanID,
		NextMessageID:         legacy.NextMessageID,
		Users:                 []user{},
		Roles:                 append([]RoleProfession(nil), legacy.Roles...),
		Plans:                 make([]WeeklyPlan, len(legacy.Plans)),
		Messages:              cloneMessages(legacy.Messages),
		MessageReceipts:       []messageReceipt{},
		LegacyMessageReceipts: []legacyMessageReceipt{},
	}
	if legacy.Profile.ID > 0 {
		profile := legacy.Profile
		next.LegacyProfile = &profile
	}
	for index, plan := range legacy.Plans {
		next.Plans[index] = clonePlan(plan)
	}
	for index := range next.Messages {
		if next.Messages[index].Status == 0 {
			next.Messages[index].Status = 1
		}
		if next.Messages[index].ReadAt != "" {
			next.LegacyMessageReceipts = append(next.LegacyMessageReceipts, legacyMessageReceipt{
				MessageID: next.Messages[index].ID,
				ReadAt:    next.Messages[index].ReadAt,
			})
		}
		next.Messages[index].ReadAt = ""
		next.Messages[index].IsRead = false
	}
	return normalizeState(next)
}

func validateState(value state) error {
	if value.Version != CurrentVersion {
		return fmt.Errorf("%w: unsupported version %d", ErrInvalidData, value.Version)
	}
	if value.NextUserID <= 0 || value.NextRoleID <= 0 || value.NextPlanID <= 0 || value.NextMessageID <= 0 {
		return fmt.Errorf("%w: invalid sequence", ErrInvalidData)
	}
	return nil
}

func normalizeState(value state) state {
	value.Version = CurrentVersion
	if value.NextUserID <= 0 {
		value.NextUserID = 1
	}
	if value.NextRoleID <= 0 {
		value.NextRoleID = 1
	}
	if value.NextPlanID <= 0 {
		value.NextPlanID = 1
	}
	if value.NextMessageID <= 0 {
		value.NextMessageID = 1
	}
	if value.Users == nil {
		value.Users = []user{}
	}
	if value.Roles == nil {
		value.Roles = []RoleProfession{}
	}
	if value.Plans == nil {
		value.Plans = []WeeklyPlan{}
	}
	if value.Messages == nil {
		value.Messages = []SiteMessage{}
	}
	if value.MessageReceipts == nil {
		value.MessageReceipts = []messageReceipt{}
	}
	for _, item := range value.Users {
		if item.ID >= value.NextUserID {
			value.NextUserID = item.ID + 1
		}
	}
	for _, role := range value.Roles {
		if role.ID >= value.NextRoleID {
			value.NextRoleID = role.ID + 1
		}
	}
	for index := range value.Plans {
		if value.Plans[index].NestCommissions == nil {
			value.Plans[index].NestCommissions = []WeeklyPlanCommission{}
		}
		if value.Plans[index].NestTickets == nil {
			value.Plans[index].NestTickets = []WeeklyPlanTicket{}
		}
		if value.Plans[index].ID >= value.NextPlanID {
			value.NextPlanID = value.Plans[index].ID + 1
		}
	}
	for index := range value.Messages {
		if value.Messages[index].Status == 0 {
			value.Messages[index].Status = 1
		}
		value.Messages[index].ReadAt = ""
		value.Messages[index].IsRead = false
		if value.Messages[index].ID >= value.NextMessageID {
			value.NextMessageID = value.Messages[index].ID + 1
		}
	}
	return value
}

func cloneState(value state) state {
	result := value
	result.Users = append([]user(nil), value.Users...)
	result.Roles = append([]RoleProfession(nil), value.Roles...)
	result.Plans = make([]WeeklyPlan, len(value.Plans))
	for index, plan := range value.Plans {
		result.Plans[index] = clonePlan(plan)
	}
	result.Messages = cloneMessages(value.Messages)
	result.MessageReceipts = append([]messageReceipt(nil), value.MessageReceipts...)
	result.LegacyMessageReceipts = append([]legacyMessageReceipt(nil), value.LegacyMessageReceipts...)
	if value.LegacyProfile != nil {
		profile := *value.LegacyProfile
		result.LegacyProfile = &profile
	}
	return result
}

func clonePlan(value WeeklyPlan) WeeklyPlan {
	result := value
	result.NestCommissions = append([]WeeklyPlanCommission(nil), value.NestCommissions...)
	result.NestTickets = append([]WeeklyPlanTicket(nil), value.NestTickets...)
	return result
}

func cloneMessages(items []SiteMessage) []SiteMessage {
	result := make([]SiteMessage, len(items))
	for index, item := range items {
		result[index] = item
		if item.Metadata != nil {
			metadata := *item.Metadata
			result[index].Metadata = &metadata
		}
	}
	return result
}

func buildMessageList(value state, userID int, query SiteMessageQuery, now time.Time) SiteMessageList {
	items := make([]SiteMessage, 0, len(value.Messages))
	unread := 0
	for _, item := range value.Messages {
		if !isMessageActive(item, now) {
			continue
		}
		receipt := findReceipt(value.MessageReceipts, userID, item.ID)
		if receipt == nil || receipt.ReadAt == "" {
			unread++
		}
		if !matchesText(item.Title+" "+item.Content, query.Keyword) {
			continue
		}
		if query.ReadStatus == "read" && (receipt == nil || receipt.ReadAt == "") {
			continue
		}
		if query.ReadStatus == "unread" && receipt != nil && receipt.ReadAt != "" {
			continue
		}
		items = append(items, withReceipt(item, receipt))
	}
	sortMessages(items)
	pageItems, meta := paginate(items, query.Page, query.PageSize)
	return SiteMessageList{Items: pageItems, Meta: meta, UnreadCount: unread}
}

func unreadMessages(value state, userID int, now time.Time) ([]SiteMessage, int) {
	items := make([]SiteMessage, 0, len(value.Messages))
	for _, item := range value.Messages {
		if !isMessageActive(item, now) {
			continue
		}
		receipt := findReceipt(value.MessageReceipts, userID, item.ID)
		if receipt != nil && receipt.ReadAt != "" {
			continue
		}
		items = append(items, withReceipt(item, receipt))
	}
	sortMessages(items)
	return items, len(items)
}

func withReceipt(item SiteMessage, receipt *messageReceipt) SiteMessage {
	item.ReadAt = ""
	item.IsRead = false
	if receipt != nil {
		item.ReadAt = receipt.ReadAt
		item.IsRead = receipt.ReadAt != ""
	}
	return item
}

func findReceipt(items []messageReceipt, userID int, messageID int) *messageReceipt {
	for index := range items {
		if items[index].UserID == userID && items[index].MessageID == messageID {
			value := items[index]
			return &value
		}
	}
	return nil
}

func setReceipt(value *state, receipt messageReceipt) {
	for index := range value.MessageReceipts {
		if value.MessageReceipts[index].UserID != receipt.UserID || value.MessageReceipts[index].MessageID != receipt.MessageID {
			continue
		}
		if receipt.NotifiedAt == "" {
			receipt.NotifiedAt = value.MessageReceipts[index].NotifiedAt
		}
		if receipt.ReadAt == "" {
			receipt.ReadAt = value.MessageReceipts[index].ReadAt
		}
		value.MessageReceipts[index] = receipt
		return
	}
	value.MessageReceipts = append(value.MessageReceipts, receipt)
}

func isMessageActive(item SiteMessage, now time.Time) bool {
	if item.Status != 1 {
		return false
	}
	if publishedAt, err := time.Parse(time.RFC3339Nano, item.PublishedAt); err == nil && publishedAt.After(now) {
		return false
	}
	return !isExpired(item.ExpiresAt, now)
}

func sortMessages(items []SiteMessage) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].PublishedAt == items[j].PublishedAt {
			return items[i].ID > items[j].ID
		}
		return items[i].PublishedAt > items[j].PublishedAt
	})
}

func validateActionURL(value string) error {
	if value == "" {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || (!strings.HasPrefix(value, "/") && parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("%w: invalid site message action URL", ErrInvalidData)
	}
	return nil
}

func normalizeRFC3339(value string, fallback time.Time) (string, error) {
	if value == "" {
		if fallback.IsZero() {
			return "", errors.New("time is required")
		}
		return fallback.UTC().Format(time.RFC3339Nano), nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339Nano, value)
	}
	if err != nil {
		return "", err
	}
	return parsed.UTC().Format(time.RFC3339Nano), nil
}

func matchesText(value string, query string) bool {
	query = strings.ToLower(strings.TrimSpace(query))
	return query == "" || strings.Contains(strings.ToLower(value), query)
}

func matchesNest(entries []WeeklyPlanCommission, query string) bool {
	query = strings.TrimSpace(strings.ReplaceAll(query, "巢穴", ""))
	if query == "" {
		return true
	}
	for _, entry := range entries {
		if strings.Contains(nestLabel(entry.ID), query) {
			return true
		}
	}
	return false
}

func nestLabel(id int) string {
	labels := map[int]string{1: "海龙", 2: "狮蝎", 3: "K博士", 4: "大主教", 5: "巨人族", 6: "火山", 7: "守卫者", 8: "迷雾", 9: "台风金", 10: "卡伊伦"}
	return labels[id]
}

func normalizeCommissions(items []WeeklyPlanCommission) ([]WeeklyPlanCommission, error) {
	if len(items) > 6 {
		return nil, fmt.Errorf("%w: at most six nest commissions are allowed", ErrInvalidData)
	}
	seen := make(map[int]struct{}, len(items))
	result := make([]WeeklyPlanCommission, 0, len(items))
	for _, item := range items {
		if nestLabel(item.ID) == "" {
			return nil, fmt.Errorf("%w: unknown nest commission %d", ErrInvalidData, item.ID)
		}
		if _, exists := seen[item.ID]; exists {
			continue
		}
		seen[item.ID] = struct{}{}
		result = append(result, item)
	}
	return result, nil
}

func normalizeTickets(items []WeeklyPlanTicket) ([]WeeklyPlanTicket, error) {
	seen := make(map[string]struct{}, len(items))
	result := make([]WeeklyPlanTicket, 0, len(items))
	for _, item := range items {
		item.ExpiresAt = normalizeTicketDate(item.ExpiresAt)
		if nestLabel(item.ID) == "" || !validTicketDate(item.ExpiresAt) {
			return nil, fmt.Errorf("%w: invalid nest ticket", ErrInvalidData)
		}
		key := fmt.Sprintf("%d:%s", item.ID, item.ExpiresAt)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, item)
	}
	return result, nil
}

func normalizeTicketDate(value string) string {
	value = strings.TrimSpace(value)
	var month, day int
	if _, err := fmt.Sscanf(value, "%d-%d", &month, &day); err != nil {
		return value
	}
	return fmt.Sprintf("%d-%d", month, day)
}

func validTicketDate(value string) bool {
	var month, day int
	if _, err := fmt.Sscanf(value, "%d-%d", &month, &day); err != nil || month < 1 || month > 12 || day < 1 || day > 31 {
		return false
	}
	date := time.Date(2024, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	return int(date.Month()) == month && date.Day() == day
}

func activeRoles(items []RoleProfession, ownerID int) []RoleProfession {
	result := make([]RoleProfession, 0, len(items))
	for _, item := range items {
		if item.OwnerID == ownerID && item.DeletedAt == "" {
			result = append(result, item)
		}
	}
	sortRoles(result)
	return result
}

func sortRoles(items []RoleProfession) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].SortOrder == items[j].SortOrder {
			return items[i].ID < items[j].ID
		}
		return items[i].SortOrder < items[j].SortOrder
	})
}

func sortPlans(items []WeeklyPlan) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].SortOrder == items[j].SortOrder {
			return items[i].ID < items[j].ID
		}
		return items[i].SortOrder < items[j].SortOrder
	})
}

func paginate[T any](items []T, page int, pageSize int) ([]T, ListMeta) {
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maximumPageSize {
		pageSize = maximumPageSize
	}
	if page <= 0 {
		page = 1
	}
	total := len(items)
	totalPages := 0
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
		if page > totalPages {
			page = totalPages
		}
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	result := append([]T(nil), items[start:end]...)
	return result, ListMeta{Total: total, TotalPages: totalPages, Page: page, PageSize: pageSize}
}

func findRoleIndex(items []RoleProfession, ownerID int, id int) int {
	for index := range items {
		if items[index].OwnerID == ownerID && items[index].ID == id {
			return index
		}
	}
	return -1
}

func findPlanIndex(items []WeeklyPlan, ownerID int, id int) int {
	for index := range items {
		if items[index].OwnerID == ownerID && items[index].ID == id {
			return index
		}
	}
	return -1
}

func findMessageIndex(items []SiteMessage, id int) int {
	for index := range items {
		if items[index].ID == id {
			return index
		}
	}
	return -1
}

func findFirstPlanForRole(items []WeeklyPlan, ownerID int, roleID int) int {
	for index := range items {
		if items[index].OwnerID == ownerID && items[index].RoleProfessionID == roleID {
			return index
		}
	}
	return -1
}

func countPlansForRole(items []WeeklyPlan, ownerID int, roleID int) int {
	count := 0
	for _, item := range items {
		if item.OwnerID == ownerID && item.RoleProfessionID == roleID {
			count++
		}
	}
	return count
}

func isExpired(value string, now time.Time) bool {
	if value == "" {
		return false
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		expiresAt, err = time.Parse(time.RFC3339, value)
	}
	return err == nil && !expiresAt.After(now)
}

func containsString(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && strings.EqualFold(address.Address, value)
}
