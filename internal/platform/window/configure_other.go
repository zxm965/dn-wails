//go:build !darwin

package window

import "github.com/wailsapp/wails/v3/pkg/application"

func Configure(windowOptions *application.WebviewWindowOptions) {
	windowOptions.Frameless = true
}
