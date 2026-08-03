package notification

import (
	systemnotification "dn-wails/internal/notification"

	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

type Wails struct {
	service *notifications.NotificationService
}

func NewWails(service *notifications.NotificationService) *Wails {
	return &Wails{service: service}
}

func (w *Wails) CheckAuthorization() (bool, error) {
	return w.service.CheckNotificationAuthorization()
}

func (w *Wails) RequestAuthorization() (bool, error) {
	return w.service.RequestNotificationAuthorization()
}

func (w *Wails) Send(notification systemnotification.NativeNotification) error {
	data := make(map[string]interface{}, len(notification.Data))
	for key, value := range notification.Data {
		data[key] = value
	}

	return w.service.SendNotification(notifications.NotificationOptions{
		ID:       notification.ID,
		Title:    notification.Title,
		Subtitle: notification.Subtitle,
		Body:     notification.Body,
		Data:     data,
	})
}

func (w *Wails) OnResponse(callback func(response systemnotification.Response)) {
	w.service.OnNotificationResponse(func(result notifications.NotificationResult) {
		data := make(map[string]string, len(result.Response.UserInfo))
		for key, value := range result.Response.UserInfo {
			if text, ok := value.(string); ok {
				data[key] = text
			}
		}

		callback(systemnotification.Response{
			NotificationID: result.Response.ID,
			ActionID:       result.Response.ActionIdentifier,
			Data:           data,
			Err:            result.Error,
		})
	})
}
