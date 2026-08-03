package application

import (
	"testing"

	"dn-wails/internal/lifecycle"
	"dn-wails/internal/notification"
	"dn-wails/internal/settings"
	"dn-wails/internal/windowmanager"
)

type runtimeReadySettingsStub struct{}

func (runtimeReadySettingsStub) Initialize() error { return nil }
func (runtimeReadySettingsStub) Get() settings.AppSettings {
	return settings.Default()
}
func (runtimeReadySettingsStub) Update(next settings.AppSettings) (settings.AppSettings, error) {
	return next, nil
}
func (runtimeReadySettingsStub) Reset() (settings.AppSettings, error) {
	return settings.Default(), nil
}
func (runtimeReadySettingsStub) UpdateWindowBounds(settings.WindowBounds) error { return nil }

type runtimeReadyWindowStub struct{}

func (runtimeReadyWindowStub) Restore(windowmanager.Preferences) {}
func (runtimeReadyWindowStub) Capture() windowmanager.Bounds {
	return windowmanager.Bounds{}
}
func (runtimeReadyWindowStub) ApplyPreferences(windowmanager.Preferences) {}
func (runtimeReadyWindowStub) Activate()                                  {}
func (runtimeReadyWindowStub) Quit()                                      {}
func (runtimeReadyWindowStub) HandleClose(string) bool                    { return false }

type runtimeReadyNotificationStub struct {
	lifecycle         *lifecycle.Service
	readyAtInitialize bool
}

func (s *runtimeReadyNotificationStub) Initialize(
	func(notification.Activation),
	func(error),
) {
	s.readyAtInitialize = s.lifecycle.Status().Ready
}

func (*runtimeReadyNotificationStub) Status() (notification.Status, error) {
	return notification.Status{}, nil
}
func (*runtimeReadyNotificationStub) RequestAuthorization() (bool, error) {
	return false, nil
}
func (*runtimeReadyNotificationStub) SendMessage(
	notification.Message,
	notification.Policy,
) (string, error) {
	return "", nil
}

func TestRuntimeReadyMarksLifecycleReadyBeforeNotificationInitialization(t *testing.T) {
	t.Parallel()

	lifecycleService := lifecycle.NewService()
	notificationService := &runtimeReadyNotificationStub{lifecycle: lifecycleService}
	app := New(Dependencies{
		SystemNotification: notificationService,
		Settings:           runtimeReadySettingsStub{},
		Lifecycle:          lifecycleService,
		Window:             runtimeReadyWindowStub{},
	})

	app.RuntimeReady()

	if !notificationService.readyAtInitialize {
		t.Fatal("expected lifecycle to be ready before notification initialization")
	}
}
