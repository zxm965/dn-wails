//go:build !darwin

package window

import "github.com/wailsapp/wails/v2/pkg/options"

func Configure(appOptions *options.App) {
	appOptions.Frameless = true
}
