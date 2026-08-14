package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"cull-pear/internal/appupdate"
	"cull-pear/internal/windowmanager"
)

type applicationUpdateStub struct {
	info             appupdate.Info
	status           appupdate.Status
	checkErr         error
	installErr       error
	installed        bool
	installedVersion string
}

func (s *applicationUpdateStub) Info() appupdate.Info {
	return s.info
}

func (s *applicationUpdateStub) Check(context.Context) (appupdate.Status, error) {
	return s.status, s.checkErr
}

func (s *applicationUpdateStub) Install(_ context.Context, expectedVersion string) error {
	s.installed = true
	s.installedVersion = expectedVersion
	return s.installErr
}

type updateWindowStub struct {
	quit chan struct{}
}

func (s *updateWindowStub) Restore(windowmanager.Preferences) {}
func (s *updateWindowStub) Capture() windowmanager.Bounds {
	return windowmanager.Bounds{}
}
func (s *updateWindowStub) ApplyPreferences(windowmanager.Preferences) {}
func (s *updateWindowStub) Activate()                                  {}
func (s *updateWindowStub) Quit() {
	select {
	case s.quit <- struct{}{}:
	default:
	}
}
func (s *updateWindowStub) HandleClose(string) bool { return false }

func TestApplicationUpdateFacade(t *testing.T) {
	t.Parallel()

	updateService := &applicationUpdateStub{
		info:   appupdate.Info{CurrentVersion: "1.0.0", Configured: true},
		status: appupdate.Status{CurrentVersion: "1.0.0", LatestVersion: "1.1.0", UpdateAvailable: true},
	}
	app := New(Dependencies{ApplicationUpdate: updateService})
	app.ctx = context.Background()

	if info := app.GetApplicationUpdateInfo(); info.CurrentVersion != "1.0.0" {
		t.Fatalf("unexpected update info: %+v", info)
	}
	status, err := app.CheckForApplicationUpdate()
	if err != nil {
		t.Fatalf("check application update: %v", err)
	}
	if !status.UpdateAvailable || status.LatestVersion != "1.1.0" {
		t.Fatalf("unexpected update status: %+v", status)
	}
}

func TestInstallApplicationUpdateQuitsAfterPreparation(t *testing.T) {
	t.Parallel()

	updateService := &applicationUpdateStub{}
	windowService := &updateWindowStub{quit: make(chan struct{}, 1)}
	app := New(Dependencies{ApplicationUpdate: updateService, Window: windowService})
	app.ctx = context.Background()

	if err := app.InstallApplicationUpdate("1.1.0"); err != nil {
		t.Fatalf("install application update: %v", err)
	}
	if !updateService.installed || updateService.installedVersion != "1.1.0" {
		t.Fatalf("update service did not receive expected version: %+v", updateService)
	}
	select {
	case <-windowService.quit:
	case <-time.After(time.Second):
		t.Fatal("expected application to quit after preparing update")
	}
}

func TestInstallApplicationUpdateKeepsApplicationOpenOnFailure(t *testing.T) {
	t.Parallel()

	expectedError := errors.New("download failed")
	updateService := &applicationUpdateStub{installErr: expectedError}
	windowService := &updateWindowStub{quit: make(chan struct{}, 1)}
	app := New(Dependencies{ApplicationUpdate: updateService, Window: windowService})
	app.ctx = context.Background()

	if err := app.InstallApplicationUpdate("1.1.0"); !errors.Is(err, expectedError) {
		t.Fatalf("expected install error, got %v", err)
	}
	select {
	case <-windowService.quit:
		t.Fatal("application should remain open when update preparation fails")
	case <-time.After(350 * time.Millisecond):
	}
}
