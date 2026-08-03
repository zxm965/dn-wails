//go:build !dev

package singleinstance

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestConfigureEnablesSingleInstanceOutsideDevelopment(t *testing.T) {
	t.Parallel()

	appOptions := &application.Options{}
	handler := func(application.SecondInstanceData) {}

	Configure(appOptions, handler)

	if appOptions.SingleInstance == nil {
		t.Fatal("expected single instance options to be configured")
	}
	if appOptions.SingleInstance.UniqueID != applicationUniqueID {
		t.Fatalf("unexpected unique ID: %q", appOptions.SingleInstance.UniqueID)
	}
	if appOptions.SingleInstance.OnSecondInstanceLaunch == nil {
		t.Fatal("expected second instance handler to be configured")
	}
}
