//go:build dev

package singleinstance

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestConfigureDisablesSingleInstanceDuringDevelopment(t *testing.T) {
	t.Parallel()

	appOptions := &application.Options{}

	Configure(appOptions, func(application.SecondInstanceData) {})

	if appOptions.SingleInstance != nil {
		t.Fatal("expected single instance options to be disabled for development builds")
	}
}
