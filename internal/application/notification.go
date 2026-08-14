package application

import "cull-pear/internal/notification"

type SystemNotificationStatus struct {
	Available  bool `json:"available"`
	Authorized bool `json:"authorized"`
}

type MessageNotificationRequest struct {
	ID             string `json:"id,omitempty"`
	Sender         string `json:"sender"`
	Content        string `json:"content"`
	ConversationID string `json:"conversationId,omitempty"`
}

func (a *App) GetSystemNotificationStatus() (SystemNotificationStatus, error) {
	status, err := a.systemNotificationService.Status()
	if err != nil {
		return SystemNotificationStatus{}, err
	}
	return SystemNotificationStatus{Available: status.Available, Authorized: status.Authorized}, nil
}

func (a *App) RequestSystemNotificationPermission() (bool, error) {
	return a.systemNotificationService.RequestAuthorization()
}

func (a *App) SendMessageNotification(request MessageNotificationRequest) (string, error) {
	preferences := a.settingsService.Get().Notifications
	return a.systemNotificationService.SendMessage(
		notification.Message{
			ID:             request.ID,
			Sender:         request.Sender,
			Content:        request.Content,
			ConversationID: request.ConversationID,
		},
		notification.Policy{
			Enabled:      preferences.Enabled,
			ShowPreview:  preferences.ShowPreview,
			DoNotDisturb: preferences.DoNotDisturb,
		},
	)
}
