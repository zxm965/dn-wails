package dn

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"cull-pear/internal/storage"
)

type memoryStore struct {
	data map[string][]byte
}

func newMemoryStore() *memoryStore {
	return &memoryStore{data: make(map[string][]byte)}
}

func (s *memoryStore) Load(key string) ([]byte, error) {
	data, exists := s.data[key]
	if !exists {
		return nil, storage.ErrNotFound
	}
	return append([]byte(nil), data...), nil
}

func (s *memoryStore) Save(key string, data []byte) error {
	s.data[key] = append([]byte(nil), data...)
	return nil
}

func (s *memoryStore) Delete(key string) error {
	delete(s.data, key)
	return nil
}

func (s *memoryStore) Location(string) (string, error) {
	return "memory", nil
}

func newAuthenticatedService(t *testing.T) (*Service, *memoryStore, Profile) {
	t.Helper()
	store := newMemoryStore()
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize service: %v", err)
	}
	profile, err := service.Register(RegistrationInput{Account: "admin", Email: "admin@example.com", Password: "password-123"})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}
	return service, store, profile
}

func TestServiceRequiresAuthentication(t *testing.T) {
	t.Parallel()
	service := NewService(newMemoryStore())
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize service: %v", err)
	}
	if _, err := service.ListRoles(RoleProfessionQuery{}); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("expected authentication error, got %v", err)
	}
	state, err := service.AuthState()
	if err != nil || state.Authenticated || state.User != nil {
		t.Fatalf("unexpected auth state: %+v err=%v", state, err)
	}
}

func TestServicePersistsSessionRoleAndWeeklyPlan(t *testing.T) {
	t.Parallel()
	service, store, profile := newAuthenticatedService(t)
	if profile.Role != UserRoleAdmin {
		t.Fatalf("first user should be administrator: %+v", profile)
	}

	role, err := service.SaveRole(RoleProfessionInput{RoleName: "冒险家", Profession: "剑皇", Priority: 2})
	if err != nil {
		t.Fatalf("save role: %v", err)
	}
	plan, err := service.SaveWeeklyPlan(WeeklyPlanInput{
		RoleProfessionID:         role.ID,
		RemainingCommissionCount: 4,
		HasInvasion:              true,
	})
	if err != nil {
		t.Fatalf("save plan: %v", err)
	}
	if plan.OwnerID != profile.ID || plan.RoleName != role.RoleName || plan.RemainingCommissionCount != 4 {
		t.Fatalf("unexpected plan: %+v", plan)
	}

	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatalf("reload service: %v", err)
	}
	auth, err := reloaded.AuthState()
	if err != nil || !auth.Authenticated || auth.User == nil || auth.User.ID != profile.ID {
		t.Fatalf("session was not restored: %+v err=%v", auth, err)
	}
	roles, err := reloaded.ListRoles(RoleProfessionQuery{Page: 1, PageSize: 15})
	if err != nil {
		t.Fatalf("list roles: %v", err)
	}
	plans, err := reloaded.AllWeeklyPlans()
	if err != nil {
		t.Fatalf("list plans: %v", err)
	}
	if roles.Meta.Total != 1 || roles.Items[0].WeeklyPlanCount != 1 || len(plans) != 1 {
		t.Fatalf("persisted data missing: roles=%+v plans=%+v", roles, plans)
	}
}

func TestServiceIsolatesUserData(t *testing.T) {
	t.Parallel()
	service, _, first := newAuthenticatedService(t)
	firstRole, err := service.SaveRole(RoleProfessionInput{RoleName: "账号一角色", Profession: "剑皇"})
	if err != nil {
		t.Fatalf("save first role: %v", err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout first user: %v", err)
	}
	second, err := service.Register(RegistrationInput{Account: "member", Email: "member@example.com", Password: "password-456"})
	if err != nil {
		t.Fatalf("register second user: %v", err)
	}
	if second.Role != UserRoleMember {
		t.Fatalf("second user should be a member: %+v", second)
	}
	secondRoles, err := service.ListRoles(RoleProfessionQuery{})
	if err != nil || secondRoles.Meta.Total != 0 {
		t.Fatalf("second user can see first user's roles: %+v err=%v", secondRoles, err)
	}
	if _, err := service.SaveWeeklyPlan(WeeklyPlanInput{RoleProfessionID: firstRole.ID}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-user role to be hidden, got %v", err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout second user: %v", err)
	}
	loggedIn, err := service.Login(LoginInput{Login: first.Email, Password: "password-123"})
	if err != nil || loggedIn.ID != first.ID {
		t.Fatalf("login first user: %+v err=%v", loggedIn, err)
	}
	firstRoles, err := service.ListRoles(RoleProfessionQuery{})
	if err != nil || firstRoles.Meta.Total != 1 {
		t.Fatalf("first user's role missing: %+v err=%v", firstRoles, err)
	}
}

func TestServiceUpdatesRoleAndCascadesPlanIdentity(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	role, _ := service.SaveRole(RoleProfessionInput{RoleName: "旧名字", Profession: "剑皇", Priority: 0})
	_, _ = service.SaveWeeklyPlan(WeeklyPlanInput{RoleProfessionID: role.ID})

	updated, err := service.SaveRole(RoleProfessionInput{
		ID: role.ID, RoleName: "新名字", Profession: "月之领主", Priority: 1, SortOrder: 4,
	})
	if err != nil {
		t.Fatalf("update role: %v", err)
	}
	plans, err := service.AllWeeklyPlans()
	if err != nil {
		t.Fatalf("list plans: %v", err)
	}
	plan := plans[0]
	if updated.WeeklyPlanCount != 1 || plan.RoleName != "新名字" || plan.Profession != "月之领主" || plan.Priority != 1 {
		t.Fatalf("role cascade failed: role=%+v plan=%+v", updated, plan)
	}
}

func TestServiceRejectsDuplicateRoleAndInvalidWeeklyPlanCount(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	role, _ := service.SaveRole(RoleProfessionInput{RoleName: "重复角色", Profession: "剑皇"})
	if _, err := service.SaveRole(RoleProfessionInput{RoleName: "重复角色", Profession: "月之领主"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected conflict, got %v", err)
	}
	for _, count := range []int{-1, 7} {
		if _, err := service.SaveWeeklyPlan(WeeklyPlanInput{
			RoleProfessionID:         role.ID,
			RemainingCommissionCount: count,
		}); !errors.Is(err, ErrInvalidData) {
			t.Fatalf("expected invalid remaining commission count error for %d, got %v", count, err)
		}
	}
}

func TestServiceLinksSpecialWeeklyCommissionsToRemainingCount(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	role, err := service.SaveRole(RoleProfessionInput{RoleName: "联动角色", Profession: "剑皇"})
	if err != nil {
		t.Fatalf("save role: %v", err)
	}

	plan, err := service.SaveWeeklyPlan(WeeklyPlanInput{
		RoleProfessionID:         role.ID,
		RemainingCommissionCount: WeeklyCommissionTotal,
		HasArk:                   true,
	})
	if err != nil {
		t.Fatalf("save ark plan: %v", err)
	}
	if plan.RemainingCommissionCount != WeeklyCommissionTotal-1 {
		t.Fatalf("ark should consume one commission: %+v", plan)
	}

	plan, err = service.SaveWeeklyPlan(WeeklyPlanInput{
		ID:                       plan.ID,
		RoleProfessionID:         role.ID,
		RemainingCommissionCount: WeeklyCommissionTotal,
		HasArk:                   true,
		HasNightmare:             true,
	})
	if err != nil {
		t.Fatalf("save ark and nightmare plan: %v", err)
	}
	if plan.RemainingCommissionCount != ManualWeeklyCommissionTotal {
		t.Fatalf("special commissions should leave four manual slots: %+v", plan)
	}

	plan, err = service.SaveWeeklyPlan(WeeklyPlanInput{
		ID:                       plan.ID,
		RoleProfessionID:         role.ID,
		RemainingCommissionCount: 0,
	})
	if err != nil {
		t.Fatalf("save reset special plan: %v", err)
	}
	if plan.RemainingCommissionCount != LinkedWeeklyCommissionTotal {
		t.Fatalf("incomplete special commissions should remain counted: %+v", plan)
	}
}

func TestServiceInitializesAndSyncsWeeklyPlans(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	first, _ := service.SaveRole(RoleProfessionInput{RoleName: "角色一", Profession: "剑皇"})
	_, _ = service.SaveWeeklyPlan(WeeklyPlanInput{
		RoleProfessionID:         first.ID,
		RemainingCommissionCount: 2,
	})
	_, _ = service.SaveRole(RoleProfessionInput{RoleName: "角色二", Profession: "圣徒"})

	syncResult, err := service.SyncWeeklyPlans()
	if err != nil || syncResult.Created != 1 || syncResult.Total != 2 {
		t.Fatalf("sync result: %+v err=%v", syncResult, err)
	}
	initializeResult, err := service.InitializeWeeklyPlans()
	if err != nil || initializeResult.Updated != 2 {
		t.Fatalf("initialize result: %+v err=%v", initializeResult, err)
	}
	plans, err := service.AllWeeklyPlans()
	if err != nil {
		t.Fatalf("list plans: %v", err)
	}
	for _, plan := range plans {
		if plan.RemainingCommissionCount != 6 {
			t.Fatalf("weekly plan was not reset: %+v", plan)
		}
	}
}

func TestServiceTracksMessageReadStatePerUser(t *testing.T) {
	t.Parallel()
	service, _, first := newAuthenticatedService(t)
	created, err := service.PublishMessage(SiteMessageInput{
		Level: MessageLevelWarning, Title: "维护提醒", Content: "今晚维护", ActionTarget: MessageTargetSelf,
	})
	if err != nil {
		t.Fatalf("publish message: %v", err)
	}
	before, err := service.ListMessages(SiteMessageQuery{ReadStatus: "unread", Page: 1, PageSize: 10})
	if err != nil || before.UnreadCount != 2 {
		t.Fatalf("expected two unread messages, got %+v err=%v", before, err)
	}
	if _, err := service.MarkMessageRead(created.ID); err != nil {
		t.Fatalf("mark message read: %v", err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := service.Register(RegistrationInput{Account: "reader", Email: "reader@example.com", Password: "password-789"}); err != nil {
		t.Fatalf("register reader: %v", err)
	}
	secondInbox, err := service.ListMessages(SiteMessageQuery{ReadStatus: "unread", Page: 1, PageSize: 10})
	if err != nil || secondInbox.UnreadCount != 2 {
		t.Fatalf("read receipt leaked to second user: %+v err=%v", secondInbox, err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout reader: %v", err)
	}
	if _, err := service.Login(LoginInput{Login: first.Account, Password: "password-123"}); err != nil {
		t.Fatalf("login first user: %v", err)
	}
	after, err := service.ListMessages(SiteMessageQuery{ReadStatus: "read", Page: 1, PageSize: 10})
	if err != nil || len(after.Items) != 1 || after.Items[0].ID != created.ID {
		t.Fatalf("unexpected read messages: %+v err=%v", after.Items, err)
	}
}

func TestServiceManagesScheduledMessagesAndAcknowledgesNotifications(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	future := time.Now().UTC().Add(time.Hour).Format(time.RFC3339Nano)
	created, err := service.PublishMessage(SiteMessageInput{
		Level: MessageLevelInfo, Title: "未来通知", Content: "等待登录后展示", Popup: true,
		ActionTarget: MessageTargetSelf, PublishedAt: future,
	})
	if err != nil {
		t.Fatalf("publish scheduled message: %v", err)
	}
	regular, err := service.ListMessages(SiteMessageQuery{Keyword: created.Title, ReadStatus: "all", Page: 1, PageSize: 10})
	if err != nil || len(regular.Items) != 0 {
		t.Fatalf("scheduled message leaked to regular inbox: %+v err=%v", regular.Items, err)
	}
	managed, err := service.ListMessages(SiteMessageQuery{Keyword: created.Title, ReadStatus: "all", Page: 1, PageSize: 10, Manage: true})
	if err != nil || len(managed.Items) != 1 || managed.Items[0].ID != created.ID {
		t.Fatalf("scheduled message missing from admin view: %+v err=%v", managed.Items, err)
	}

	updated, err := service.UpdateMessage(created.ID, SiteMessageInput{
		Level: MessageLevelWarning, Title: "登录提醒", Content: "用户登录后全屏展示", Popup: true,
		ActionTarget: MessageTargetSelf,
	})
	if err != nil || updated.Title != "登录提醒" || updated.Level != MessageLevelWarning {
		t.Fatalf("update message: %+v err=%v", updated, err)
	}
	firstClaim, err := service.ClaimMessageNotifications(20)
	if err != nil || !messageListContains(firstClaim.Items, created.ID) {
		t.Fatalf("updated message was not claimable: %+v err=%v", firstClaim.Items, err)
	}
	secondClaim, err := service.ClaimMessageNotifications(20)
	if err != nil || !messageListContains(secondClaim.Items, created.ID) {
		t.Fatalf("claim should remain available until display acknowledgement: %+v err=%v", secondClaim.Items, err)
	}
	if err := service.MarkMessageNotified(created.ID); err != nil {
		t.Fatalf("mark message notified: %v", err)
	}
	acknowledgedClaim, err := service.ClaimMessageNotifications(20)
	if err != nil || messageListContains(acknowledgedClaim.Items, created.ID) {
		t.Fatalf("acknowledged message was claimed again: %+v err=%v", acknowledgedClaim.Items, err)
	}
	deleted, err := service.DeleteMessage(created.ID)
	if err != nil || deleted.Status != 0 {
		t.Fatalf("delete message: %+v err=%v", deleted, err)
	}
	managed, err = service.ListMessages(SiteMessageQuery{Keyword: updated.Title, ReadStatus: "all", Page: 1, PageSize: 10, Manage: true})
	if err != nil || len(managed.Items) != 0 {
		t.Fatalf("deleted message remained visible: %+v err=%v", managed.Items, err)
	}
	service.mu.RLock()
	deletedIndex := findMessageIndex(service.state.Messages, created.ID)
	retainedAsTombstone := deletedIndex >= 0 && service.state.Messages[deletedIndex].Status == 0
	service.mu.RUnlock()
	if !retainedAsTombstone {
		t.Fatal("deleted message tombstone was not retained")
	}
}

func TestServiceChangesPassword(t *testing.T) {
	t.Parallel()
	service, _, profile := newAuthenticatedService(t)
	if err := service.ChangePassword(PasswordInput{CurrentPassword: "wrong-password", NewPassword: "new-password-123"}); !errors.Is(err, ErrInvalidData) {
		t.Fatalf("expected current password error, got %v", err)
	}
	if err := service.ChangePassword(PasswordInput{CurrentPassword: "password-123", NewPassword: "new-password-123"}); err != nil {
		t.Fatalf("change password: %v", err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := service.Login(LoginInput{Login: profile.Account, Password: "password-123"}); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("old password should fail, got %v", err)
	}
	if _, err := service.Login(LoginInput{Login: profile.Account, Password: "new-password-123"}); err != nil {
		t.Fatalf("new password should work: %v", err)
	}
}

func TestPasswordHashIsCompatibleWithNodeScrypt(t *testing.T) {
	t.Parallel()
	stored := "scrypt:00112233445566778899aabbccddeeff:85f3d113c8cbfd6a509f68d82d22f81954404c439b6a2d0a83ef87a6113ff42618160f1e983fab2c67c456574ee2119fef6faf9af41b1a5007a5c0da6e241f16"
	if !verifyPassword("compat-password", stored) {
		t.Fatal("expected Go verifier to accept Node.js scrypt output")
	}
	if verifyPassword("wrong-password", stored) {
		t.Fatal("expected verifier to reject the wrong password")
	}
}

func TestServiceKeepsLegacySessionAndRestrictsAdminOperations(t *testing.T) {
	t.Parallel()
	service, _, _ := newAuthenticatedService(t)
	adminMessage, err := service.PublishMessage(SiteMessageInput{Level: MessageLevelInfo, Title: "管理员消息"})
	if err != nil {
		t.Fatalf("publish admin message: %v", err)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout admin: %v", err)
	}
	if _, err := service.Register(RegistrationInput{Account: "member", Email: "member@example.com", Password: "password-456"}); err != nil {
		t.Fatalf("register member: %v", err)
	}
	if _, err := service.PublishMessage(SiteMessageInput{Level: MessageLevelInfo, Title: "越权消息"}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("member should not publish messages, got %v", err)
	}
	if _, err := service.ListMessages(SiteMessageQuery{Manage: true, Page: 1, PageSize: 10}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("member should not list managed messages, got %v", err)
	}
	if _, err := service.UpdateMessage(adminMessage.ID, SiteMessageInput{Level: MessageLevelInfo, Title: "越权修改"}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("member should not update messages, got %v", err)
	}
	if _, err := service.DeleteMessage(adminMessage.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("member should not delete messages, got %v", err)
	}

	service.mu.Lock()
	next := cloneState(service.state)
	next.Session.ExpiresAt = time.Now().UTC().Add(-time.Minute).Format(time.RFC3339Nano)
	if err := service.commit(next); err != nil {
		service.mu.Unlock()
		t.Fatalf("persist legacy expiry: %v", err)
	}
	service.mu.Unlock()
	auth, err := service.AuthState()
	if err != nil || !auth.Authenticated || auth.User == nil {
		t.Fatalf("legacy session expiry should not force re-login: %+v err=%v", auth, err)
	}
}

func messageListContains(items []SiteMessage, id int) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}

func TestServiceMigratesLegacyDataToFirstUser(t *testing.T) {
	t.Parallel()
	store := newMemoryStore()
	now := time.Now().UTC().Format(time.RFC3339Nano)
	legacy := legacyState{
		Version:       1,
		NextRoleID:    2,
		NextPlanID:    2,
		NextMessageID: 2,
		Profile:       Profile{ID: 1, Account: "local", Name: "旧资料名称", Email: "local@dn.app", Avatar: "data:image/png;base64,AA==", Role: 1, Status: 1, CreatedAt: now},
		Roles:         []RoleProfession{{ID: 1, RoleName: "旧角色", Profession: "剑皇", CreatedAt: now, UpdatedAt: now}},
		Plans: []legacyWeeklyPlan{{
			ID: 1, RoleProfessionID: 1, RoleName: "旧角色", Profession: "剑皇",
			NestCommissions: []legacyWeeklyPlanCommission{{ID: 1, Completed: true}, {ID: 2}},
			CreatedAt:       now, UpdatedAt: now,
		}},
		Messages: []SiteMessage{{ID: 1, Source: "desktop", Level: MessageLevelInfo, Title: "旧消息", PublishedAt: now, ReadAt: now}},
	}
	data, _ := json.Marshal(legacy)
	if err := store.Save(storageKey, data); err != nil {
		t.Fatalf("save legacy data: %v", err)
	}
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatalf("migrate service: %v", err)
	}
	profile, err := service.Register(RegistrationInput{Account: "owner", Email: "owner@example.com", Password: "password-123"})
	if err != nil {
		t.Fatalf("register owner: %v", err)
	}
	if profile.Name != "旧资料名称" || profile.Avatar == "" || profile.Role != UserRoleAdmin {
		t.Fatalf("legacy profile was not claimed: %+v", profile)
	}
	roles, err := service.ListRoles(RoleProfessionQuery{})
	if err != nil || roles.Meta.Total != 1 || roles.Items[0].OwnerID != profile.ID {
		t.Fatalf("legacy roles were not claimed: %+v err=%v", roles, err)
	}
	plans, err := service.AllWeeklyPlans()
	if err != nil || len(plans) != 1 || plans[0].RemainingCommissionCount != 1 {
		t.Fatalf("legacy weekly plan was not migrated: %+v err=%v", plans, err)
	}
	messages, err := service.ListMessages(SiteMessageQuery{ReadStatus: "read", Page: 1, PageSize: 10})
	if err != nil || len(messages.Items) != 1 || messages.Items[0].ID != 1 {
		t.Fatalf("legacy read receipt was not claimed: %+v err=%v", messages, err)
	}
}

func TestServiceMigratesVersionTwoWeeklyPlanDetails(t *testing.T) {
	t.Parallel()
	store := newMemoryStore()
	legacy := legacyStateV2{
		Version:       2,
		NextUserID:    1,
		NextRoleID:    1,
		NextPlanID:    2,
		NextMessageID: 1,
		Plans: []legacyWeeklyPlan{{
			ID: 1,
			NestCommissions: []legacyWeeklyPlanCommission{
				{ID: 1, Completed: true},
				{ID: 2},
				{ID: 3},
			},
		}},
	}
	data, _ := json.Marshal(legacy)
	if err := store.Save(storageKey, data); err != nil {
		t.Fatalf("save version 2 data: %v", err)
	}
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatalf("migrate version 2 service: %v", err)
	}
	if service.state.Version != CurrentVersion || len(service.state.Plans) != 1 || service.state.Plans[0].RemainingCommissionCount != 2 {
		t.Fatalf("version 2 weekly plan was not migrated: %+v", service.state.Plans)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func TestServiceSyncsOfficialMessages(t *testing.T) {
	t.Parallel()
	requestCount := 0
	publishedAt := time.Now().UTC().Add(-time.Hour).Format("2006-01-02 15:04:05")
	listPayload, _ := json.Marshal(map[string]any{
		"dataList": [][]any{
			{"ID", "unused"},
			{12345, "", "", "104", "", "", "0", "1", "官网维护公告", "", "维护摘要", "", "", "", publishedAt, "/news/example.html"},
		},
	})
	apiPayload, _ := json.Marshal(map[string]any{
		"IsSuccess":    true,
		"ReturnCode":   0,
		"ReturnObject": string(listPayload),
	})
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		requestCount++
		if request.URL.String() != officialNewsListURL || request.Method != http.MethodPost {
			t.Fatalf("unexpected official request: %s %s", request.Method, request.URL)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(string(apiPayload))),
			Request:    request,
		}, nil
	})}
	store := newMemoryStore()
	service := NewServiceWithHTTPClient(store, client)
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize service: %v", err)
	}
	if _, err := service.Register(RegistrationInput{Account: "admin", Email: "admin@example.com", Password: "password-123"}); err != nil {
		t.Fatalf("register admin: %v", err)
	}
	result, err := service.SyncOfficialMessages()
	if err != nil || result.Fetched != 1 || result.Published != 1 || result.SyncedAt == "" {
		t.Fatalf("unexpected sync result: %+v err=%v", result, err)
	}
	second, err := service.SyncOfficialMessages()
	if err != nil || !second.Skipped {
		t.Fatalf("expected manual interval skip: %+v err=%v", second, err)
	}
	if requestCount != 1 {
		t.Fatalf("expected manual interval to avoid a second request, got %d", requestCount)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("logout admin: %v", err)
	}
	member, err := service.Register(RegistrationInput{Account: "member", Email: "member@example.com", Password: "password-456"})
	if err != nil {
		t.Fatalf("register member: %v", err)
	}
	memberSync, err := service.SyncOfficialMessages()
	if err != nil || !memberSync.Skipped {
		t.Fatalf("expected member manual sync to share the two-minute limit: %+v err=%v", memberSync, err)
	}

	restartedService := NewServiceWithHTTPClient(store, client)
	if err := restartedService.Initialize(); err != nil {
		t.Fatalf("initialize restarted service: %v", err)
	}
	if _, err := restartedService.CheckOfficialMessagesOnLogin(); err != nil {
		t.Fatalf("check official messages for the first member login: %v", err)
	}
	if requestCount != 2 {
		t.Fatalf("expected the first member login to check official messages, got %d requests", requestCount)
	}

	recentLoginService := NewServiceWithHTTPClient(store, client)
	if err := recentLoginService.Initialize(); err != nil {
		t.Fatalf("initialize recent-login service: %v", err)
	}
	recentLogin, err := recentLoginService.CheckOfficialMessagesOnLogin()
	if err != nil || !recentLogin.Skipped {
		t.Fatalf("expected a login within 30 minutes to skip the official request: %+v err=%v", recentLogin, err)
	}
	if requestCount != 2 {
		t.Fatalf("expected recent login to keep request count at 2, got %d", requestCount)
	}

	recentLoginService.mu.Lock()
	next := cloneState(recentLoginService.state)
	next.OfficialSync.LastLoginAtByUser[strconv.Itoa(member.ID)] = time.Now().UTC().Add(-31 * time.Minute).Format(time.RFC3339Nano)
	if err := recentLoginService.commit(next); err != nil {
		recentLoginService.mu.Unlock()
		t.Fatalf("age member login timestamp: %v", err)
	}
	recentLoginService.mu.Unlock()
	staleLoginService := NewServiceWithHTTPClient(store, client)
	if err := staleLoginService.Initialize(); err != nil {
		t.Fatalf("initialize stale-login service: %v", err)
	}
	if _, err := staleLoginService.CheckOfficialMessagesOnLogin(); err != nil {
		t.Fatalf("check official messages after 30 minutes: %v", err)
	}
	if requestCount != 3 {
		t.Fatalf("expected a login after 30 minutes to request official messages, got %d requests", requestCount)
	}
	messages, err := service.ListMessages(SiteMessageQuery{Keyword: "维护", ReadStatus: "all", Page: 1, PageSize: 10})
	if err != nil || len(messages.Items) != 1 || messages.Items[0].Source != "dragon-nest-official" {
		t.Fatalf("official message missing: %+v err=%v", messages, err)
	}
}
