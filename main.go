package main

import (
	"embed"
	"log"
	"time"

	"dn-wails/internal/appconfig"
	"dn-wails/internal/application"
	"dn-wails/internal/diagnostics"
	"dn-wails/internal/greeting"
	"dn-wails/internal/lifecycle"
	"dn-wails/internal/nativekit"
	"dn-wails/internal/notification"
	platformnativekit "dn-wails/internal/platform/nativekit"
	platformnotification "dn-wails/internal/platform/notification"
	platformsingleinstance "dn-wails/internal/platform/singleinstance"
	platformwindow "dn-wails/internal/platform/window"
	"dn-wails/internal/settings"
	"dn-wails/internal/singleinstance"
	"dn-wails/internal/storage"
	"dn-wails/internal/windowmanager"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed .env
var applicationConfigData []byte

const (
	internalApplicationName = "dn-wails"
	appVersion              = "0.0.0"
)

func main() {
	startedAt := time.Now()
	applicationConfig, err := appconfig.Parse(applicationConfigData)
	if err != nil {
		log.Fatal("load application config: ", err)
	}

	settingsStore, err := storage.NewFileStore(internalApplicationName)
	if err != nil {
		log.Fatal("create settings store: ", err)
	}
	settingsService := settings.NewService(settingsStore)

	diagnosticsService, err := diagnostics.NewService(internalApplicationName, appVersion, startedAt)
	if err != nil {
		log.Fatal("create diagnostics service: ", err)
	}
	defer diagnosticsService.Close()

	greetingService := greeting.NewService()
	notificationPlatform := platformnotification.NewWails()
	notificationService := notification.NewService(notificationPlatform)
	nativePlatform := platformnativekit.NewWails()
	nativeService := nativekit.NewService(nativePlatform)
	windowPlatform := platformwindow.NewRuntime()
	windowService := windowmanager.NewService(windowPlatform)
	lifecycleService := lifecycle.NewService()
	singleInstanceService := singleinstance.NewService()

	app := application.New(application.Dependencies{
		Greeting:           greetingService,
		SystemNotification: notificationService,
		Settings:           settingsService,
		Lifecycle:          lifecycleService,
		SingleInstance:     singleInstanceService,
		Window:             windowService,
		Native:             nativeService,
		Diagnostics:        diagnosticsService,
	})

	appOptions := &options.App{
		Title:     applicationConfig.DisplayName,
		Width:     1024,
		Height:    768,
		MinWidth:  720,
		MinHeight: 520,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.OnStartup,
		OnDomReady:       app.OnDomReady,
		OnBeforeClose:    app.OnBeforeClose,
		OnShutdown:       app.OnShutdown,
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop: true,
		},
		Bind: []interface{}{
			app,
		},
	}
	platformwindow.Configure(appOptions)
	platformsingleinstance.Configure(appOptions, application.SecondInstanceHandler(app))

	if err := wails.Run(appOptions); err != nil {
		log.Fatal("run application: ", err)
	}
}
