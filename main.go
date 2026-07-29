package main

import (
	"embed"
	"log"

	"dn-wails/internal/application"
	"dn-wails/internal/greeting"
	platformwindow "dn-wails/internal/platform/window"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	greetingService := greeting.NewService()
	app := application.New(greetingService)

	appOptions := &options.App{
		Title:     "dn-wails",
		Width:     1024,
		Height:    768,
		MinWidth:  720,
		MinHeight: 520,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		Bind: []interface{}{
			app,
		},
	}
	platformwindow.Configure(appOptions)

	if err := wails.Run(appOptions); err != nil {
		log.Fatal("run application: ", err)
	}
}
