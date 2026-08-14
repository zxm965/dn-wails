package application

import "cull-pear/internal/dn"

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

func (a *App) ListSiteMessages(query dn.SiteMessageQuery) (dn.SiteMessageList, error) {
	return a.dnService.ListMessages(query)
}

func (a *App) GetSiteMessageInbox(limit int) (dn.SiteMessageInbox, error) {
	return a.dnService.MessageInbox(limit)
}

func (a *App) ClaimSiteMessageNotifications(limit int) (dn.SiteMessageClaim, error) {
	return a.dnService.ClaimMessageNotifications(limit)
}

func (a *App) MarkSiteMessageRead(id int) (dn.SiteMessage, error) {
	return a.dnService.MarkMessageRead(id)
}

func (a *App) MarkAllSiteMessagesRead() (int, error) {
	return a.dnService.MarkAllMessagesRead()
}

func (a *App) PublishSiteMessage(input dn.SiteMessageInput) (dn.SiteMessage, error) {
	return a.dnService.PublishMessage(input)
}

func (a *App) SyncOfficialSiteMessages() (dn.OfficialMessageSyncResult, error) {
	return a.dnService.SyncOfficialMessages()
}
