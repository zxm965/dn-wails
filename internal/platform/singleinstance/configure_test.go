//go:build !dev

package singleinstance

import (
	"testing"

	"github.com/wailsapp/wails/v2/pkg/options"
)

func TestConfigureEnablesSingleInstanceLockOutsideDevelopment(t *testing.T) {
	t.Parallel()

	appOptions := &options.App{}
	handler := func(options.SecondInstanceData) {}

	Configure(appOptions, handler)

	if appOptions.SingleInstanceLock == nil {
		t.Fatal("expected single instance lock to be configured")
	}
	if appOptions.SingleInstanceLock.UniqueId != applicationUniqueID {
		t.Fatalf("unexpected unique ID: %q", appOptions.SingleInstanceLock.UniqueId)
	}
	if appOptions.SingleInstanceLock.OnSecondInstanceLaunch == nil {
		t.Fatal("expected second instance handler to be configured")
	}
}
