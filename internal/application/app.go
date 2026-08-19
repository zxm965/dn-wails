package application

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"cull-pear/internal/account"
	"cull-pear/internal/appupdate"
	"cull-pear/internal/diagnostics"
	"cull-pear/internal/dn"
	"cull-pear/internal/lifecycle"
	"cull-pear/internal/nativekit"
	"cull-pear/internal/notification"
	"cull-pear/internal/quicknotes"
	"cull-pear/internal/settings"
	"cull-pear/internal/singleinstance"
	"cull-pear/internal/windowmanager"

	wailsapplication "github.com/wailsapp/wails/v3/pkg/application"
)

const (
	SystemNotificationActivatedEvent = "system-notification:activated"
	SecondInstanceLaunchedEvent      = "app:second-instance"
	FileDropEvent                    = "native-kit:file-drop"
)

var ErrAppNotReady = errors.New("application is not ready")

func init() {
	wailsapplication.RegisterEvent[notification.Activation](SystemNotificationActivatedEvent)
	wailsapplication.RegisterEvent[singleinstance.LaunchData](SecondInstanceLaunchedEvent)
	wailsapplication.RegisterEvent[FileDrop](FileDropEvent)
}

type FileDrop struct {
	X     int      `json:"x"`
	Y     int      `json:"y"`
	Paths []string `json:"paths"`
}

type SystemNotificationService interface {
	Initialize(onActivation func(notification.Activation), onError func(error))
	Status() (notification.Status, error)
	RequestAuthorization() (bool, error)
	SendMessage(message notification.Message, policy notification.Policy) (string, error)
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
	Restore(preferences windowmanager.Preferences)
	Capture() windowmanager.Bounds
	ApplyPreferences(preferences windowmanager.Preferences)
	Activate()
	Quit()
	HandleClose(closeBehavior string) bool
}

type NativeService interface {
	OpenExternalURL(rawURL string) error
	OpenPath(path string) error
	ReadClipboard() (string, error)
	WriteClipboard(text string) error
	OpenFiles(options nativekit.OpenFilesOptions) ([]string, error)
	OpenDirectory(title string, defaultDirectory string) (string, error)
	SaveFile(options nativekit.SaveFileOptions) (string, error)
	ShowMessageDialog(options nativekit.MessageDialogOptions) (string, error)
	Screens() ([]nativekit.Screen, error)
}

type DiagnosticsService interface {
	Initialize() error
	Info() diagnostics.Info
	Close() error
}

type InstallationService interface {
	Initialize() error
}

type ApplicationUpdateService interface {
	Info() appupdate.Info
	Check(ctx context.Context) (appupdate.Status, error)
	Install(ctx context.Context, expectedVersion string) error
}

type AccountService interface {
	Initialize() error
	Close() error
	Health() error
	CurrentUserID() (int, error)
	CurrentAdminUserID() (int, error)
	AuthState() (account.AuthState, error)
	Register(input account.RegistrationInput) (account.Profile, error)
	Login(input account.LoginInput) (account.Profile, error)
	Logout() error
	Profile() (account.Profile, error)
	UpdateProfile(input account.ProfileInput) (account.Profile, error)
	ChangePassword(input account.PasswordInput) error
	ImportAvatar(path string) (string, error)
}

type DnService interface {
	Initialize() error
	Close() error
	Health() error
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
	MarkMessageNotified(id int) error
	MarkMessageRead(id int) (dn.SiteMessage, error)
	MarkAllMessagesRead() (int, error)
	PublishMessage(input dn.SiteMessageInput) (dn.SiteMessage, error)
	UpdateMessage(id int, input dn.SiteMessageInput) (dn.SiteMessage, error)
	DeleteMessage(id int) (dn.SiteMessage, error)
	SyncOfficialMessages() (dn.OfficialMessageSyncResult, error)
}

type QuickNotesService interface {
	Initialize() error
	Close() error
	Health() error
	List() ([]quicknotes.Note, error)
	Save(input quicknotes.NoteInput) (quicknotes.Note, error)
	Delete(id int64) error
}

type Dependencies struct {
	Runtime            *wailsapplication.App
	SystemNotification SystemNotificationService
	Settings           SettingsService
	Lifecycle          LifecycleService
	SingleInstance     SingleInstanceService
	Window             WindowService
	Native             NativeService
	Diagnostics        DiagnosticsService
	Installation       InstallationService
	ApplicationUpdate  ApplicationUpdateService
	Account            AccountService
	Dn                 DnService
	QuickNotes         QuickNotesService
}

// App is the Wails v3 service exposed to the frontend.
type App struct {
	runtime                   *wailsapplication.App
	systemNotificationService SystemNotificationService
	settingsService           SettingsService
	lifecycleService          LifecycleService
	singleInstanceService     SingleInstanceService
	windowService             WindowService
	nativeService             NativeService
	diagnosticsService        DiagnosticsService
	installationService       InstallationService
	applicationUpdateService  ApplicationUpdateService
	accountService            AccountService
	dnService                 DnService
	quickNotesService         QuickNotesService

	mu                    sync.RWMutex
	ctx                   context.Context
	runtimeReady          bool
	forceQuit             bool
	pendingSecondLaunches []singleinstance.LaunchData
}

func New(dependencies Dependencies) *App {
	return &App{
		runtime:                   dependencies.Runtime,
		systemNotificationService: dependencies.SystemNotification,
		settingsService:           dependencies.Settings,
		lifecycleService:          dependencies.Lifecycle,
		singleInstanceService:     dependencies.SingleInstance,
		windowService:             dependencies.Window,
		nativeService:             dependencies.Native,
		diagnosticsService:        dependencies.Diagnostics,
		installationService:       dependencies.Installation,
		applicationUpdateService:  dependencies.ApplicationUpdate,
		accountService:            dependencies.Account,
		dnService:                 dependencies.Dn,
		quickNotesService:         dependencies.QuickNotes,
	}
}

func (a *App) ServiceStartup(ctx context.Context, _ wailsapplication.ServiceOptions) error {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()

	if err := a.diagnosticsService.Initialize(); err != nil {
		log.Printf("initialize diagnostics: %v", err)
	}
	if err := a.installationService.Initialize(); err != nil {
		log.Printf("initialize installation identity: %v", err)
	}
	if err := a.settingsService.Initialize(); err != nil {
		log.Printf("initialize settings with defaults: %v", err)
	}
	if err := a.accountService.Initialize(); err != nil {
		log.Printf("initialize account service: %v", err)
	}
	if err := a.dnService.Initialize(); err != nil {
		log.Printf("initialize dn system data: %v", err)
	}
	if err := a.quickNotesService.Initialize(); err != nil {
		log.Printf("initialize quick notes: %v", err)
	}
	a.lifecycleService.Start(time.Now())
	return nil
}

//wails:ignore
func (a *App) RuntimeReady() {
	a.mu.Lock()
	a.runtimeReady = true
	pendingLaunches := append([]singleinstance.LaunchData(nil), a.pendingSecondLaunches...)
	a.pendingSecondLaunches = nil
	a.mu.Unlock()

	a.windowService.Restore(windowPreferences(a.settingsService.Get().Window))
	a.lifecycleService.MarkReady()
	for _, launch := range pendingLaunches {
		a.emitSecondInstance(launch)
	}

	a.systemNotificationService.Initialize(a.handleNotificationActivation, func(err error) {
		log.Printf("handle system notification response: %v", err)
	})
}

//wails:ignore
func (a *App) HandleWindowClosing(event *wailsapplication.WindowEvent) {
	currentSettings := a.settingsService.Get()
	if currentSettings.Window.RememberBounds {
		if err := a.saveWindowBounds(); err != nil {
			log.Printf("save window bounds: %v", err)
		}
	}

	a.mu.RLock()
	forceQuit := a.forceQuit
	a.mu.RUnlock()
	if forceQuit {
		return
	}

	event.Cancel()
	if a.windowService.HandleClose(currentSettings.Window.CloseBehavior) {
		return
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	go a.windowService.Quit()
}

//wails:ignore
func (a *App) ShouldQuit() bool {
	currentSettings := a.settingsService.Get()
	if currentSettings.Window.RememberBounds {
		if err := a.saveWindowBounds(); err != nil {
			log.Printf("save window bounds before quit: %v", err)
		}
	}
	return true
}

func (a *App) RequestWindowClose() error {
	currentSettings := a.settingsService.Get()
	if currentSettings.Window.CloseBehavior == settings.CloseBehaviorHide {
		if currentSettings.Window.RememberBounds {
			if err := a.saveWindowBounds(); err != nil {
				return err
			}
		}
		a.windowService.HandleClose(currentSettings.Window.CloseBehavior)
		return nil
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	a.windowService.Quit()
	return nil
}

func (a *App) QuitApplication() error {
	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	a.windowService.Quit()
	return nil
}

func (a *App) ServiceShutdown() error {
	a.lifecycleService.Stop()
	if err := a.quickNotesService.Close(); err != nil {
		log.Printf("close quick notes database: %v", err)
	}
	if err := a.dnService.Close(); err != nil {
		log.Printf("close dn database: %v", err)
	}
	if err := a.accountService.Close(); err != nil {
		log.Printf("close account database: %v", err)
	}
	if err := a.diagnosticsService.Close(); err != nil {
		log.Printf("close diagnostics: %v", err)
	}

	a.mu.Lock()
	a.ctx = nil
	a.runtimeReady = false
	a.mu.Unlock()
	return nil
}

//wails:ignore
func (a *App) HandleSecondInstanceLaunch(data wailsapplication.SecondInstanceData) {
	launch := a.singleInstanceService.Normalize(data.Args, data.WorkingDir)
	a.lifecycleService.RecordSecondInstance()

	a.mu.Lock()
	if !a.runtimeReady {
		a.pendingSecondLaunches = append(a.pendingSecondLaunches, launch)
		a.mu.Unlock()
		return
	}
	a.mu.Unlock()

	a.emitSecondInstance(launch)
}

//wails:ignore
func (a *App) HandleFileDrop(event *wailsapplication.WindowEvent) {
	if event == nil || event.Context() == nil {
		return
	}
	paths := event.Context().DroppedFiles()
	if len(paths) == 0 {
		return
	}

	drop := FileDrop{Paths: append([]string(nil), paths...)}
	if target := event.Context().DropTargetDetails(); target != nil {
		drop.X = target.X
		drop.Y = target.Y
	}
	a.runtime.Event.Emit(FileDropEvent, drop)
}

func (a *App) emitSecondInstance(launch singleinstance.LaunchData) {
	a.windowService.Activate()
	a.runtime.Event.Emit(SecondInstanceLaunchedEvent, launch)
}

func (a *App) handleNotificationActivation(activation notification.Activation) {
	a.windowService.Activate()
	a.runtime.Event.Emit(SystemNotificationActivatedEvent, activation)
}

func (a *App) saveWindowBounds() error {
	bounds := a.windowService.Capture()
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
