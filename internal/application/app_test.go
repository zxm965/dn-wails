package application

import (
	"context"
	"testing"

	"dn-wails/internal/lifecycle"
	"dn-wails/internal/notification"
	"dn-wails/internal/settings"
	"dn-wails/internal/windowmanager"
)

type domReadySettingsStub struct{}

func (domReadySettingsStub) Initialize() error { return nil }
func (domReadySettingsStub) Get() settings.AppSettings {
	return settings.Default()
}
func (domReadySettingsStub) Update(next settings.AppSettings) (settings.AppSettings, error) {
	return next, nil
}
func (domReadySettingsStub) Reset() (settings.AppSettings, error) {
	return settings.Default(), nil
}
func (domReadySettingsStub) UpdateWindowBounds(settings.WindowBounds) error { return nil }

type domReadyWindowStub struct{}

func (domReadyWindowStub) Restore(context.Context, windowmanager.Preferences) {}
func (domReadyWindowStub) Capture(context.Context) windowmanager.Bounds {
	return windowmanager.Bounds{}
}
func (domReadyWindowStub) ApplyPreferences(context.Context, windowmanager.Preferences) {}
func (domReadyWindowStub) Activate(context.Context)                                    {}
func (domReadyWindowStub) Quit(context.Context)                                        {}
func (domReadyWindowStub) HandleClose(context.Context, string) bool                    { return false }

type domReadyNotificationStub struct {
	lifecycle         *lifecycle.Service
	readyAtInitialize bool
}

func (s *domReadyNotificationStub) Initialize(
	context.Context,
	func(notification.Activation),
	func(error),
) error {
	s.readyAtInitialize = s.lifecycle.Status().Ready
	return nil
}

func (*domReadyNotificationStub) Cleanup(context.Context) {}
func (*domReadyNotificationStub) Status(context.Context) (notification.Status, error) {
	return notification.Status{}, nil
}
func (*domReadyNotificationStub) RequestAuthorization(context.Context) (bool, error) {
	return false, nil
}
func (*domReadyNotificationStub) SendMessage(
	context.Context,
	notification.Message,
	notification.Policy,
) (string, error) {
	return "", nil
}

func TestOnDomReadyMarksLifecycleReadyBeforeNotificationInitialization(t *testing.T) {
	t.Parallel()

	lifecycleService := lifecycle.NewService()
	notificationService := &domReadyNotificationStub{lifecycle: lifecycleService}
	app := New(Dependencies{
		SystemNotification: notificationService,
		Settings:           domReadySettingsStub{},
		Lifecycle:          lifecycleService,
		Window:             domReadyWindowStub{},
	})

	app.OnDomReady(context.Background())

	if !notificationService.readyAtInitialize {
		t.Fatal("expected lifecycle to be ready before notification initialization")
	}
}
