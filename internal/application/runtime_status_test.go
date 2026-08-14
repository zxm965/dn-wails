package application

import (
	"errors"
	"strings"
	"testing"
	"time"

	"cull-pear/internal/account"
	"cull-pear/internal/appupdate"
	"cull-pear/internal/diagnostics"
	"cull-pear/internal/lifecycle"
	"cull-pear/internal/notification"
)

type runtimeAccountStub struct {
	AccountService
	err error
}

func (s runtimeAccountStub) Health() error { return s.err }

type runtimeDnStub struct {
	DnService
	err error
}

func (s runtimeDnStub) Health() error { return s.err }

type runtimeQuickNotesStub struct {
	QuickNotesService
	err error
}

func (s runtimeQuickNotesStub) Health() error { return s.err }

type runtimeLifecycleStub struct {
	LifecycleService
	status lifecycle.Status
}

func (s runtimeLifecycleStub) Status() lifecycle.Status { return s.status }

type runtimeDiagnosticsStub struct {
	DiagnosticsService
	info diagnostics.Info
}

func (s runtimeDiagnosticsStub) Info() diagnostics.Info { return s.info }

type runtimeNotificationStub struct {
	SystemNotificationService
	status notification.Status
	err    error
}

func (s runtimeNotificationStub) Status() (notification.Status, error) { return s.status, s.err }

type runtimeUpdateStub struct {
	ApplicationUpdateService
	info appupdate.Info
}

func (s runtimeUpdateStub) Info() appupdate.Info { return s.info }

func TestGetRuntimeStatusReportsSafeServiceHealth(t *testing.T) {
	t.Parallel()

	startedAt := time.Now().Add(-5 * time.Minute)
	app := New(Dependencies{
		Account: runtimeAccountStub{err: account.ErrUnavailable},
		Dn:      runtimeDnStub{err: errors.New("postgres://secret@example.invalid/database")},
		QuickNotes: runtimeQuickNotesStub{
			err: nil,
		},
		Lifecycle: runtimeLifecycleStub{status: lifecycle.Status{
			StartedAt:           startedAt,
			Ready:               true,
			SecondInstanceCount: 2,
		}},
		Diagnostics: runtimeDiagnosticsStub{info: diagnostics.Info{
			AppVersion:   "1.2.3",
			GoVersion:    "go1.26",
			OS:           "darwin",
			Arch:         "arm64",
			LogDirectory: "/tmp/logs",
			LogFile:      "/tmp/logs/app.log",
		}},
		SystemNotification: runtimeNotificationStub{status: notification.Status{Available: true}},
		ApplicationUpdate:  runtimeUpdateStub{info: appupdate.Info{}},
	})

	status := app.GetRuntimeStatus()
	if status.Overall != RuntimeOverallDegraded {
		t.Fatalf("expected degraded runtime, got %q", status.Overall)
	}
	if !status.Ready || status.SecondInstanceCount != 2 || status.UptimeSeconds < 290 {
		t.Fatalf("unexpected lifecycle status: %+v", status)
	}
	if len(status.Services) != 6 {
		t.Fatalf("expected six services, got %+v", status.Services)
	}
	if status.Services[0].Status != RuntimeServiceUnavailable {
		t.Fatalf("expected account service to be unavailable: %+v", status.Services[0])
	}
	if status.Services[1].Status != RuntimeServiceReady {
		t.Fatalf("expected quick notes service to be ready: %+v", status.Services[1])
	}
	if status.Services[2].Status != RuntimeServiceError {
		t.Fatalf("expected DN service error: %+v", status.Services[2])
	}
	for _, service := range status.Services {
		if strings.Contains(service.Detail, "secret") || strings.Contains(service.Detail, "postgres://") {
			t.Fatalf("service detail leaked sensitive diagnostics: %+v", service)
		}
	}
	if status.AppVersion != "1.2.3" || status.OS != "darwin" || status.Arch != "arm64" {
		t.Fatalf("unexpected diagnostics fields: %+v", status)
	}
}

func TestGetRuntimeStatusIsHealthyWhenRequiredServicesAreReady(t *testing.T) {
	t.Parallel()

	app := New(Dependencies{
		Account:            runtimeAccountStub{},
		Dn:                 runtimeDnStub{},
		QuickNotes:         runtimeQuickNotesStub{},
		Lifecycle:          runtimeLifecycleStub{status: lifecycle.Status{StartedAt: time.Now(), Ready: true}},
		Diagnostics:        runtimeDiagnosticsStub{},
		SystemNotification: runtimeNotificationStub{status: notification.Status{Available: true, Authorized: true}},
		ApplicationUpdate:  runtimeUpdateStub{info: appupdate.Info{Configured: true, CanInstall: true}},
	})

	status := app.GetRuntimeStatus()
	if status.Overall != RuntimeOverallHealthy {
		t.Fatalf("expected healthy runtime, got %+v", status)
	}
	for _, service := range status.Services {
		if service.Status != RuntimeServiceReady {
			t.Fatalf("expected ready service, got %+v", service)
		}
	}
}
