package application

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"dn-wails/internal/diagnostics"
	"dn-wails/internal/dn"
	"dn-wails/internal/lifecycle"
	"dn-wails/internal/nativekit"
	"dn-wails/internal/notification"
	"dn-wails/internal/settings"
	"dn-wails/internal/singleinstance"
	"dn-wails/internal/windowmanager"

	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	SystemNotificationActivatedEvent = "system-notification:activated"
	SecondInstanceLaunchedEvent      = "app:second-instance"
)

var ErrAppNotReady = errors.New("application is not ready")

type GreetingService interface {
	Greet(name string) (string, error)
}

type SystemNotificationService interface {
	Initialize(ctx context.Context, onActivation func(notification.Activation), onError func(error)) error
	Cleanup(ctx context.Context)
	Status(ctx context.Context) (notification.Status, error)
	RequestAuthorization(ctx context.Context) (bool, error)
	SendMessage(ctx context.Context, message notification.Message, policy notification.Policy) (string, error)
}

type SettingsService interface {
	Initialize() error
	Get() settings.AppSettings
	Update(next settings.AppSettings) (settings.AppSettings, error)
	Reset() (settings.AppSettings, error)
	UpdateWindowBounds(bounds settings.WindowBounds) error
}

type LifecycleService interface {
	Start(startedAt time.Time)
	MarkReady()
	RecordSecondInstance()
	Stop()
	Status() lifecycle.Status
}

type SingleInstanceService interface {
	Normalize(arguments []string, workingDirectory string) singleinstance.LaunchData
}

type WindowService interface {
	Restore(ctx context.Context, preferences windowmanager.Preferences)
	Capture(ctx context.Context) windowmanager.Bounds
	ApplyPreferences(ctx context.Context, preferences windowmanager.Preferences)
	Activate(ctx context.Context)
	Quit(ctx context.Context)
	HandleClose(ctx context.Context, closeBehavior string) bool
}

type NativeService interface {
	OpenExternalURL(ctx context.Context, rawURL string) error
	OpenPath(ctx context.Context, path string) error
	ReadClipboard(ctx context.Context) (string, error)
	WriteClipboard(ctx context.Context, text string) error
	OpenFiles(ctx context.Context, options nativekit.OpenFilesOptions) ([]string, error)
	OpenDirectory(ctx context.Context, title string, defaultDirectory string) (string, error)
	SaveFile(ctx context.Context, options nativekit.SaveFileOptions) (string, error)
	ShowMessageDialog(ctx context.Context, options nativekit.MessageDialogOptions) (string, error)
	Screens(ctx context.Context) ([]nativekit.Screen, error)
}

type DiagnosticsService interface {
	Initialize() error
	Info() diagnostics.Info
	Close() error
}

type DnService interface {
	Initialize() error
	Close() error
	AuthState() (dn.AuthState, error)
	Register(input dn.RegistrationInput) (dn.Profile, error)
	Login(input dn.LoginInput) (dn.Profile, error)
	Logout() error
	Profile() (dn.Profile, error)
	UpdateProfile(input dn.ProfileInput) (dn.Profile, error)
	ChangePassword(input dn.PasswordInput) error
	ImportAvatar(path string) (string, error)
	ListRoles(query dn.RoleProfessionQuery) (dn.RoleProfessionList, error)
	RoleOptions() ([]dn.RoleProfession, error)
	SaveRole(input dn.RoleProfessionInput) (dn.RoleProfession, error)
	DeleteRole(id int) (dn.RoleProfession, error)
	ListWeeklyPlans(query dn.WeeklyPlanQuery) (dn.WeeklyPlanList, error)
	AllWeeklyPlans() ([]dn.WeeklyPlan, error)
	SaveWeeklyPlan(input dn.WeeklyPlanInput) (dn.WeeklyPlan, error)
	DeleteWeeklyPlan(id int) (dn.WeeklyPlan, error)
	InitializeWeeklyPlans() (dn.WeeklyPlanInitializationResult, error)
	SyncWeeklyPlans() (dn.WeeklyPlanSyncResult, error)
	ListMessages(query dn.SiteMessageQuery) (dn.SiteMessageList, error)
	MessageInbox(limit int) (dn.SiteMessageInbox, error)
	ClaimMessageNotifications(limit int) (dn.SiteMessageClaim, error)
	MarkMessageRead(id int) (dn.SiteMessage, error)
	MarkAllMessagesRead() (int, error)
	PublishMessage(input dn.SiteMessageInput) (dn.SiteMessage, error)
	SyncOfficialMessages() (dn.OfficialMessageSyncResult, error)
}

type Dependencies struct {
	Greeting           GreetingService
	SystemNotification SystemNotificationService
	Settings           SettingsService
	Lifecycle          LifecycleService
	SingleInstance     SingleInstanceService
	Window             WindowService
	Native             NativeService
	Diagnostics        DiagnosticsService
	Dn                 DnService
}

// App is the Wails-facing application facade.
type App struct {
	greetingService           GreetingService
	systemNotificationService SystemNotificationService
	settingsService           SettingsService
	lifecycleService          LifecycleService
	singleInstanceService     SingleInstanceService
	windowService             WindowService
	nativeService             NativeService
	diagnosticsService        DiagnosticsService
	dnService                 DnService

	mu                    sync.RWMutex
	ctx                   context.Context
	domReady              bool
	forceQuit             bool
	pendingSecondLaunches []singleinstance.LaunchData
}

func New(dependencies Dependencies) *App {
	return &App{
		greetingService:           dependencies.Greeting,
		systemNotificationService: dependencies.SystemNotification,
		settingsService:           dependencies.Settings,
		lifecycleService:          dependencies.Lifecycle,
		singleInstanceService:     dependencies.SingleInstance,
		windowService:             dependencies.Window,
		nativeService:             dependencies.Native,
		diagnosticsService:        dependencies.Diagnostics,
		dnService:                 dependencies.Dn,
	}
}

func (a *App) Greet(name string) (string, error) {
	return a.greetingService.Greet(name)
}

func (a *App) OnStartup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()

	if err := a.diagnosticsService.Initialize(); err != nil {
		log.Printf("initialize diagnostics: %v", err)
	}
	if err := a.settingsService.Initialize(); err != nil {
		log.Printf("initialize settings with defaults: %v", err)
	}
	if err := a.dnService.Initialize(); err != nil {
		log.Printf("initialize dn system data: %v", err)
	}
	a.lifecycleService.Start(time.Now())
}

func (a *App) OnDomReady(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.domReady = true
	pendingLaunches := append([]singleinstance.LaunchData(nil), a.pendingSecondLaunches...)
	a.pendingSecondLaunches = nil
	a.mu.Unlock()

	a.windowService.Restore(ctx, windowPreferences(a.settingsService.Get().Window))
	if err := a.systemNotificationService.Initialize(ctx, a.handleNotificationActivation, func(err error) {
		log.Printf("handle system notification response: %v", err)
	}); err != nil {
		log.Printf("initialize system notifications: %v", err)
	}

	a.lifecycleService.MarkReady()
	for _, launch := range pendingLaunches {
		a.emitSecondInstance(ctx, launch)
	}
}

func (a *App) OnBeforeClose(ctx context.Context) bool {
	a.mu.Lock()
	forceQuit := a.forceQuit
	a.forceQuit = false
	a.mu.Unlock()

	currentSettings := a.settingsService.Get()
	if currentSettings.Window.RememberBounds {
		if err := a.saveWindowBounds(ctx); err != nil {
			log.Printf("save window bounds: %v", err)
		}
	}

	if forceQuit {
		return false
	}
	return a.windowService.HandleClose(ctx, currentSettings.Window.CloseBehavior)
}

func (a *App) RequestWindowClose() error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}

	currentSettings := a.settingsService.Get()
	if currentSettings.Window.CloseBehavior == settings.CloseBehaviorHide {
		if currentSettings.Window.RememberBounds {
			if err := a.saveWindowBounds(ctx); err != nil {
				return err
			}
		}
		a.windowService.HandleClose(ctx, currentSettings.Window.CloseBehavior)
		return nil
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	a.windowService.Quit(ctx)
	return nil
}

func (a *App) QuitApplication() error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	a.windowService.Quit(ctx)
	return nil
}

func (a *App) OnShutdown(ctx context.Context) {
	a.systemNotificationService.Cleanup(ctx)
	a.lifecycleService.Stop()
	if err := a.dnService.Close(); err != nil {
		log.Printf("close dn database: %v", err)
	}
	if err := a.diagnosticsService.Close(); err != nil {
		log.Printf("close diagnostics: %v", err)
	}

	a.mu.Lock()
	a.ctx = nil
	a.domReady = false
	a.mu.Unlock()
}

func SecondInstanceHandler(app *App) func(data options.SecondInstanceData) {
	return func(data options.SecondInstanceData) {
		app.handleSecondInstanceLaunch(data)
	}
}

func (a *App) handleSecondInstanceLaunch(data options.SecondInstanceData) {
	launch := a.singleInstanceService.Normalize(data.Args, data.WorkingDirectory)
	a.lifecycleService.RecordSecondInstance()

	a.mu.Lock()
	ctx := a.ctx
	if ctx == nil || !a.domReady {
		a.pendingSecondLaunches = append(a.pendingSecondLaunches, launch)
		a.mu.Unlock()
		return
	}
	a.mu.Unlock()

	a.emitSecondInstance(ctx, launch)
}

func (a *App) emitSecondInstance(ctx context.Context, launch singleinstance.LaunchData) {
	a.windowService.Activate(ctx)
	runtime.EventsEmit(ctx, SecondInstanceLaunchedEvent, launch)
}

func (a *App) handleNotificationActivation(activation notification.Activation) {
	ctx, err := a.runtimeContext()
	if err != nil {
		log.Printf("activate system notification: %v", err)
		return
	}

	a.windowService.Activate(ctx)
	runtime.EventsEmit(ctx, SystemNotificationActivatedEvent, activation)
}

func (a *App) saveWindowBounds(ctx context.Context) error {
	bounds := a.windowService.Capture(ctx)
	return a.settingsService.UpdateWindowBounds(settings.WindowBounds{
		X:         bounds.X,
		Y:         bounds.Y,
		Width:     bounds.Width,
		Height:    bounds.Height,
		Maximised: bounds.Maximised,
	})
}

func (a *App) runtimeContext() (context.Context, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.ctx == nil {
		return nil, ErrAppNotReady
	}

	return a.ctx, nil
}

func windowPreferences(value settings.Window) windowmanager.Preferences {
	preferences := windowmanager.Preferences{
		CloseBehavior:  value.CloseBehavior,
		AlwaysOnTop:    value.AlwaysOnTop,
		RememberBounds: value.RememberBounds,
	}
	if value.Bounds != nil {
		preferences.Bounds = &windowmanager.Bounds{
			X:         value.Bounds.X,
			Y:         value.Bounds.Y,
			Width:     value.Bounds.Width,
			Height:    value.Bounds.Height,
			Maximised: value.Bounds.Maximised,
		}
	}
	return preferences
}
