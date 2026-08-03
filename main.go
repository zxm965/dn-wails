package main

import (
	"embed"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"runtime"
	"time"

	"dn-wails/internal/appconfig"
	"dn-wails/internal/application"
	"dn-wails/internal/appupdate"
	"dn-wails/internal/buildinfo"
	"dn-wails/internal/diagnostics"
	"dn-wails/internal/dn"
	"dn-wails/internal/lifecycle"
	"dn-wails/internal/nativekit"
	"dn-wails/internal/notification"
	platformappupdate "dn-wails/internal/platform/appupdate"
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

//go:embed all:.env*
var environmentFiles embed.FS

const (
	internalApplicationName = "dn-wails"
)

func main() {
	startedAt := time.Now()
	applicationConfigData, err := environmentFiles.ReadFile(".env")
	if err != nil {
		log.Fatal("read embedded application config: ", err)
	}
	applicationConfig, err := appconfig.Parse(applicationConfigData)
	if err != nil {
		log.Fatal("load application config: ", err)
	}
	databaseConfigData, err := environmentFiles.ReadFile(".env.local")
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatal("read embedded database config: ", err)
	}

	settingsStore, err := storage.NewFileStore(internalApplicationName)
	if err != nil {
		log.Fatal("create settings store: ", err)
	}
	settingsService := settings.NewService(settingsStore)
	dnService := application.DnService(dn.NewUnavailableService())
	databaseURL, databaseConfigErr := dn.ResolveDatabaseURL(databaseConfigData)
	if databaseConfigErr == nil {
		postgresService, postgresErr := dn.NewPostgresService(databaseURL, settingsStore)
		if postgresErr != nil {
			log.Printf("DN database service is unavailable: invalid DATABASE_URL")
		} else {
			dnService = postgresService
		}
	} else {
		log.Printf("DN database service is unavailable: %v", databaseConfigErr)
	}

	diagnosticsService, err := diagnostics.NewService(internalApplicationName, buildinfo.Version, startedAt)
	if err != nil {
		log.Fatal("create diagnostics service: ", err)
	}
	defer diagnosticsService.Close()

	notificationPlatform := platformnotification.NewWails()
	notificationService := notification.NewService(notificationPlatform)
	nativePlatform := platformnativekit.NewWails()
	nativeService := nativekit.NewService(nativePlatform)
	windowPlatform := platformwindow.NewRuntime()
	windowService := windowmanager.NewService(windowPlatform)
	lifecycleService := lifecycle.NewService()
	singleInstanceService := singleinstance.NewService()
	applicationUpdateSource := platformappupdate.NewGitHubSource(&http.Client{Timeout: 30 * time.Second})
	applicationUpdateInstaller := platformappupdate.NewInstaller(internalApplicationName)
	applicationUpdateService := appupdate.NewService(appupdate.Config{
		AppName:    internalApplicationName,
		Version:    buildinfo.Version,
		Repository: buildinfo.Repository,
		Platform:   runtime.GOOS,
		Arch:       runtime.GOARCH,
	}, applicationUpdateSource, applicationUpdateInstaller)

	app := application.New(application.Dependencies{
		SystemNotification: notificationService,
		Settings:           settingsService,
		Lifecycle:          lifecycleService,
		SingleInstance:     singleInstanceService,
		Window:             windowService,
		Native:             nativeService,
		Diagnostics:        diagnosticsService,
		ApplicationUpdate:  applicationUpdateService,
		Dn:                 dnService,
	})

	appOptions := &options.App{
		Title:     applicationConfig.DisplayName,
		Width:     1280,
		Height:    800,
		MinWidth:  1024,
		MinHeight: 768,
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
