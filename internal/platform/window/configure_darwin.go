//go:build darwin

package window

import (
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

func Configure(appOptions *options.App) {
	appOptions.Mac = &mac.Options{
		TitleBar: mac.TitleBarHidden(),
	}
}
