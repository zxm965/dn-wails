//go:build dev

package singleinstance

import (
	"testing"

	"github.com/wailsapp/wails/v2/pkg/options"
)

func TestConfigureDisablesSingleInstanceLockDuringDevelopment(t *testing.T) {
	t.Parallel()

	appOptions := &options.App{}

	Configure(appOptions, func(options.SecondInstanceData) {})

	if appOptions.SingleInstanceLock != nil {
		t.Fatal("expected single instance lock to be disabled for development builds")
	}
}
