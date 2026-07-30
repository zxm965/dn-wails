package notification

import (
	"context"

	systemnotification "dn-wails/internal/notification"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Wails implements native notifications with the notification runtime bundled with Wails.
type Wails struct{}

func NewWails() *Wails {
	return &Wails{}
}

func (w *Wails) Initialize(ctx context.Context) error {
	return runtime.InitializeNotifications(ctx)
}

func (w *Wails) Cleanup(ctx context.Context) {
	runtime.CleanupNotifications(ctx)
}

func (w *Wails) IsAvailable(ctx context.Context) bool {
	return runtime.IsNotificationAvailable(ctx)
}

func (w *Wails) CheckAuthorization(ctx context.Context) (bool, error) {
	return runtime.CheckNotificationAuthorization(ctx)
}

func (w *Wails) RequestAuthorization(ctx context.Context) (bool, error) {
	return runtime.RequestNotificationAuthorization(ctx)
}

func (w *Wails) Send(ctx context.Context, notification systemnotification.NativeNotification) error {
	data := make(map[string]interface{}, len(notification.Data))
	for key, value := range notification.Data {
		data[key] = value
	}

	return runtime.SendNotification(ctx, runtime.NotificationOptions{
		ID:       notification.ID,
		Title:    notification.Title,
		Subtitle: notification.Subtitle,
		Body:     notification.Body,
		Data:     data,
	})
}

func (w *Wails) OnResponse(ctx context.Context, callback func(response systemnotification.Response)) {
	runtime.OnNotificationResponse(ctx, func(result runtime.NotificationResult) {
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
