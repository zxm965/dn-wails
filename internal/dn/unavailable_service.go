package dn

import "errors"

var ErrUnavailable = errors.New("DN 服务暂不可用：当前桌面版本未配置安全的服务端连接")

type UnavailableService struct{}

func NewUnavailableService() *UnavailableService {
	return &UnavailableService{}
}

func (*UnavailableService) Initialize() error { return nil }
func (*UnavailableService) Close() error      { return nil }

func (*UnavailableService) AuthState() (AuthState, error) {
	return AuthState{}, ErrUnavailable
}

func (*UnavailableService) Register(RegistrationInput) (Profile, error) {
	return Profile{}, ErrUnavailable
}

func (*UnavailableService) Login(LoginInput) (Profile, error) {
	return Profile{}, ErrUnavailable
}

func (*UnavailableService) Logout() error {
	return ErrUnavailable
}

func (*UnavailableService) Profile() (Profile, error) {
	return Profile{}, ErrUnavailable
}

func (*UnavailableService) UpdateProfile(ProfileInput) (Profile, error) {
	return Profile{}, ErrUnavailable
}

func (*UnavailableService) ChangePassword(PasswordInput) error {
	return ErrUnavailable
}

func (*UnavailableService) ImportAvatar(string) (string, error) {
	return "", ErrUnavailable
}

func (*UnavailableService) ListRoles(RoleProfessionQuery) (RoleProfessionList, error) {
	return RoleProfessionList{}, ErrUnavailable
}

func (*UnavailableService) RoleOptions() ([]RoleProfession, error) {
	return nil, ErrUnavailable
}

func (*UnavailableService) SaveRole(RoleProfessionInput) (RoleProfession, error) {
	return RoleProfession{}, ErrUnavailable
}

func (*UnavailableService) DeleteRole(int) (RoleProfession, error) {
	return RoleProfession{}, ErrUnavailable
}

func (*UnavailableService) ListWeeklyPlans(WeeklyPlanQuery) (WeeklyPlanList, error) {
	return WeeklyPlanList{}, ErrUnavailable
}

func (*UnavailableService) AllWeeklyPlans() ([]WeeklyPlan, error) {
	return nil, ErrUnavailable
}

func (*UnavailableService) SaveWeeklyPlan(WeeklyPlanInput) (WeeklyPlan, error) {
	return WeeklyPlan{}, ErrUnavailable
}

func (*UnavailableService) DeleteWeeklyPlan(int) (WeeklyPlan, error) {
	return WeeklyPlan{}, ErrUnavailable
}

func (*UnavailableService) InitializeWeeklyPlans() (WeeklyPlanInitializationResult, error) {
	return WeeklyPlanInitializationResult{}, ErrUnavailable
}

func (*UnavailableService) SyncWeeklyPlans() (WeeklyPlanSyncResult, error) {
	return WeeklyPlanSyncResult{}, ErrUnavailable
}

func (*UnavailableService) ListMessages(SiteMessageQuery) (SiteMessageList, error) {
	return SiteMessageList{}, ErrUnavailable
}

func (*UnavailableService) MessageInbox(int) (SiteMessageInbox, error) {
	return SiteMessageInbox{}, ErrUnavailable
}

func (*UnavailableService) ClaimMessageNotifications(int) (SiteMessageClaim, error) {
	return SiteMessageClaim{}, ErrUnavailable
}

func (*UnavailableService) MarkMessageRead(int) (SiteMessage, error) {
	return SiteMessage{}, ErrUnavailable
}

func (*UnavailableService) MarkAllMessagesRead() (int, error) {
	return 0, ErrUnavailable
}

func (*UnavailableService) PublishMessage(SiteMessageInput) (SiteMessage, error) {
	return SiteMessage{}, ErrUnavailable
}

func (*UnavailableService) SyncOfficialMessages() (OfficialMessageSyncResult, error) {
	return OfficialMessageSyncResult{}, ErrUnavailable
}
