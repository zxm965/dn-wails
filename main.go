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
	appservice "dn-wails/internal/application"
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

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed all:.env*
var environmentFiles embed.FS

//go:embed build/appicon.png
var trayIcon []byte

const internalApplicationName = "dn-wails"

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
	runtimeConfigData, err := environmentFiles.ReadFile(".env.local")
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatal("read embedded runtime config: ", err)
	}

	settingsStore, err := storage.NewFileStore(internalApplicationName)
	if err != nil {
		log.Fatal("create settings store: ", err)
	}
	settingsService := settings.NewService(settingsStore)
	dnService := appservice.DnService(dn.NewUnavailableService())
	databaseURL, databaseConfigErr := dn.ResolveDatabaseURL(runtimeConfigData)
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

	notificationRuntime := notifications.New()
	notificationPlatform := platformnotification.NewWails(notificationRuntime)
	notificationService := notification.NewService(notificationPlatform)
	lifecycleService := lifecycle.NewService()
	singleInstanceService := singleinstance.NewService()
	updateBaseURL, updateConfigErr := appupdate.ResolveUpdateBaseURL(runtimeConfigData)
	var applicationUpdateSource appupdate.ReleaseSource
	if updateConfigErr != nil {
		log.Printf("Application update service is unavailable: %v", updateConfigErr)
	} else {
		applicationUpdateSource, err = platformappupdate.NewStaticSource(
			&http.Client{Timeout: 30 * time.Second},
			updateBaseURL,
			buildinfo.Repository,
		)
		if err != nil {
			log.Printf("Application update service is unavailable: %v", err)
		}
	}
	applicationUpdateInstaller := platformappupdate.NewInstaller(internalApplicationName)
	applicationUpdateService := appupdate.NewService(appupdate.Config{
		AppName:       internalApplicationName,
		Version:       buildinfo.Version,
		UpdateBaseURL: updateBaseURL,
		Platform:      runtime.GOOS,
		Arch:          runtime.GOARCH,
	}, applicationUpdateSource, applicationUpdateInstaller)

	var facade *appservice.App
	var tray *application.SystemTray
	appOptions := application.Options{
		Name: applicationConfig.DisplayName,
		Services: []application.Service{
			application.NewService(notificationRuntime),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
		Windows: application.WindowsOptions{
			DisableQuitOnLastWindowClosed: true,
		},
		Linux: application.LinuxOptions{
			DisableQuitOnLastWindowClosed: true,
		},
		ShouldQuit: func() bool {
			return facade == nil || facade.ShouldQuit()
		},
		OnShutdown: func() {
			if tray != nil {
				tray.Destroy()
			}
		},
	}
	platformsingleinstance.Configure(&appOptions, func(data application.SecondInstanceData) {
		if facade != nil {
			facade.HandleSecondInstanceLaunch(data)
		}
	})

	wailsApp := application.New(appOptions)
	windowOptions := application.WebviewWindowOptions{
		Name:             "main",
		Title:            applicationConfig.DisplayName,
		Width:            1280,
		Height:           800,
		MinWidth:         1024,
		MinHeight:        768,
		BackgroundColour: application.NewRGB(27, 38, 54),
		EnableFileDrop:   true,
		URL:              "/",
	}
	platformwindow.Configure(&windowOptions)
	mainWindow := wailsApp.Window.NewWithOptions(windowOptions)

	nativePlatform := platformnativekit.NewWails(wailsApp, mainWindow)
	nativeService := nativekit.NewService(nativePlatform)
	windowPlatform := platformwindow.NewRuntime(wailsApp, mainWindow)
	windowService := windowmanager.NewService(windowPlatform)

	facade = appservice.New(appservice.Dependencies{
		Runtime:            wailsApp,
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
	wailsApp.RegisterService(application.NewService(facade))

	mainWindow.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
		facade.RuntimeReady()
	})
	mainWindow.RegisterHook(events.Common.WindowClosing, facade.HandleWindowClosing)
	mainWindow.OnWindowEvent(events.Common.WindowFilesDropped, facade.HandleFileDrop)

	tray = setupSystemTray(wailsApp, mainWindow, facade, applicationConfig.DisplayName)

	if err := wailsApp.Run(); err != nil {
		log.Fatal("run application: ", err)
	}
}

func setupSystemTray(
	app *application.App,
	window *application.WebviewWindow,
	facade *appservice.App,
	displayName string,
) *application.SystemTray {
	tray := app.SystemTray.New()
	tray.SetIcon(trayIcon)
	tray.SetTooltip(displayName)

	showWindow := func() {
		window.Show()
		window.UnMinimise()
		window.Focus()
	}
	tray.OnClick(showWindow)

	menu := app.NewMenu()
	menu.Add("显示主窗口").OnClick(func(_ *application.Context) {
		showWindow()
	})
	menu.AddSeparator()
	menu.Add("退出").OnClick(func(_ *application.Context) {
		if err := facade.QuitApplication(); err != nil {
			log.Printf("quit application from system tray: %v", err)
		}
	})
	tray.SetMenu(menu)
	return tray
}
