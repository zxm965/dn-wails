package application

import "dn-wails/internal/dn"

func (a *App) GetDnAuthState() (dn.AuthState, error) {
	return a.dnService.AuthState()
}

func (a *App) RegisterDnUser(input dn.RegistrationInput) (dn.Profile, error) {
	return a.dnService.Register(input)
}

func (a *App) LoginDnUser(input dn.LoginInput) (dn.Profile, error) {
	return a.dnService.Login(input)
}

func (a *App) LogoutDnUser() error {
	return a.dnService.Logout()
}

func (a *App) GetDnProfile() (dn.Profile, error) {
	return a.dnService.Profile()
}

func (a *App) UpdateDnProfile(input dn.ProfileInput) (dn.Profile, error) {
	return a.dnService.UpdateProfile(input)
}

func (a *App) ChangeDnPassword(input dn.PasswordInput) error {
	return a.dnService.ChangePassword(input)
}

func (a *App) ImportDnAvatar(path string) (string, error) {
	return a.dnService.ImportAvatar(path)
}

func (a *App) ListDnRoles(query dn.RoleProfessionQuery) (dn.RoleProfessionList, error) {
	return a.dnService.ListRoles(query)
}

func (a *App) ListDnRoleOptions() ([]dn.RoleProfession, error) {
	return a.dnService.RoleOptions()
}

func (a *App) SaveDnRole(input dn.RoleProfessionInput) (dn.RoleProfession, error) {
	return a.dnService.SaveRole(input)
}

func (a *App) DeleteDnRole(id int) (dn.RoleProfession, error) {
	return a.dnService.DeleteRole(id)
}

func (a *App) ListDnWeeklyPlans(query dn.WeeklyPlanQuery) (dn.WeeklyPlanList, error) {
	return a.dnService.ListWeeklyPlans(query)
}

func (a *App) ListAllDnWeeklyPlans() ([]dn.WeeklyPlan, error) {
	return a.dnService.AllWeeklyPlans()
}

func (a *App) SaveDnWeeklyPlan(input dn.WeeklyPlanInput) (dn.WeeklyPlan, error) {
	return a.dnService.SaveWeeklyPlan(input)
}

func (a *App) DeleteDnWeeklyPlan(id int) (dn.WeeklyPlan, error) {
	return a.dnService.DeleteWeeklyPlan(id)
}

func (a *App) InitializeDnWeeklyPlans() (dn.WeeklyPlanInitializationResult, error) {
	return a.dnService.InitializeWeeklyPlans()
}

func (a *App) SyncDnWeeklyPlans() (dn.WeeklyPlanSyncResult, error) {
	return a.dnService.SyncWeeklyPlans()
}

func (a *App) ListDnMessages(query dn.SiteMessageQuery) (dn.SiteMessageList, error) {
	return a.dnService.ListMessages(query)
}

func (a *App) GetDnMessageInbox(limit int) (dn.SiteMessageInbox, error) {
	return a.dnService.MessageInbox(limit)
}

func (a *App) ClaimDnMessageNotifications(limit int) (dn.SiteMessageClaim, error) {
	return a.dnService.ClaimMessageNotifications(limit)
}

func (a *App) MarkDnMessageRead(id int) (dn.SiteMessage, error) {
	return a.dnService.MarkMessageRead(id)
}

func (a *App) MarkAllDnMessagesRead() (int, error) {
	return a.dnService.MarkAllMessagesRead()
}

func (a *App) PublishDnMessage(input dn.SiteMessageInput) (dn.SiteMessage, error) {
	return a.dnService.PublishMessage(input)
}

func (a *App) SyncDnOfficialMessages() (dn.OfficialMessageSyncResult, error) {
	return a.dnService.SyncOfficialMessages()
}
