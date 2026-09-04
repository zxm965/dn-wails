package main

import (
	"embed"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"runtime"
	"time"

	"cull-pear/internal/account"
	"cull-pear/internal/appconfig"
	appservice "cull-pear/internal/application"
	"cull-pear/internal/appupdate"
	"cull-pear/internal/buildinfo"
	"cull-pear/internal/diagnostics"
	"cull-pear/internal/dn"
	"cull-pear/internal/dnprocess"
	"cull-pear/internal/installation"
	"cull-pear/internal/lifecycle"
	"cull-pear/internal/nativekit"
	"cull-pear/internal/notification"
	platformappupdate "cull-pear/internal/platform/appupdate"
	platformdnprocess "cull-pear/internal/platform/dnprocess"
	platformnativekit "cull-pear/internal/platform/nativekit"
	platformnotification "cull-pear/internal/platform/notification"
	platformsingleinstance "cull-pear/internal/platform/singleinstance"
	platformwindow "cull-pear/internal/platform/window"
	"cull-pear/internal/quicknotes"
	"cull-pear/internal/settings"
	"cull-pear/internal/singleinstance"
	"cull-pear/internal/storage"
	"cull-pear/internal/windowmanager"

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

const internalApplicationName = "cull-pear"

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
	installationService := installation.NewService(settingsStore, buildinfo.Version)
	accountService := appservice.AccountService(account.NewUnavailableService())
	dnService := appservice.DnService(dn.NewUnavailableService())
	quickNotesService := appservice.QuickNotesService(quicknotes.NewUnavailableService())
	dnProcessService := appservice.DnProcessService(dnprocess.NewUnavailableService())
	dnProcessService = platformdnprocess.New()
	databaseURL, databaseConfigErr := dn.ResolveDatabaseURL(runtimeConfigData)
	if databaseConfigErr == nil {
		postgresAccount, accountErr := account.NewPostgresService(databaseURL, settingsStore)
		if accountErr != nil {
			log.Printf("account database service is unavailable: invalid DATABASE_URL")
		} else {
			accountService = postgresAccount
			postgresDn, dnErr := dn.NewPostgresService(databaseURL, postgresAccount)
			if dnErr != nil {
				log.Printf("DN database service is unavailable: invalid DATABASE_URL")
			} else {
				dnService = postgresDn
			}
			postgresQuickNotes, quickNotesErr := quicknotes.NewPostgresService(databaseURL, postgresAccount)
			if quickNotesErr != nil {
				log.Printf("quick notes database service is unavailable: invalid DATABASE_URL")
			} else {
				quickNotesService = postgresQuickNotes
			}
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
	updateSourceConfig := appupdate.SourceConfig{
		UpdateEndpoint: buildinfo.UpdateEndpoint,
		Repository:     buildinfo.Repository,
	}
	if databaseConfigErr == nil {
		configuredSource, sourceErr := platformappupdate.LoadSourceConfig(databaseURL, platformappupdate.SourceSelector{
			AppCode:  internalApplicationName,
			Channel:  "stable",
			Platform: runtime.GOOS,
			Arch:     runtime.GOARCH,
		})
		if sourceErr != nil {
			log.Printf("application update source database config is unavailable, using embedded default: %v", sourceErr)
		} else {
			updateSourceConfig = configuredSource
		}
	}
	applicationUpdateSource := platformappupdate.NewEndpointSource(
		&http.Client{Timeout: 30 * time.Second},
		installationService,
	)
	applicationUpdateInstaller := platformappupdate.NewInstaller(internalApplicationName, applicationConfig.DisplayName)
	applicationUpdateService := appupdate.NewService(appupdate.Config{
		AppName:        internalApplicationName,
		Version:        buildinfo.Version,
		Repository:     updateSourceConfig.Repository,
		UpdateEndpoint: updateSourceConfig.UpdateEndpoint,
		Platform:       runtime.GOOS,
		Arch:           runtime.GOARCH,
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
		GlobalShortcut:     wailsApp.GlobalShortcut,
		SystemNotification: notificationService,
		Settings:           settingsService,
		Lifecycle:          lifecycleService,
		SingleInstance:     singleInstanceService,
		Window:             windowService,
		Native:             nativeService,
		Diagnostics:        diagnosticsService,
		Installation:       installationService,
		ApplicationUpdate:  applicationUpdateService,
		Account:            accountService,
		Dn:                 dnService,
		QuickNotes:         quickNotesService,
		DnProcess:          dnProcessService,
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
