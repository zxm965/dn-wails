package dnprocess

import "errors"

var (
	ErrBusy               = errors.New("Dragon Nest process operation is already running")
	ErrUnavailable        = errors.New("Dragon Nest process control is unavailable")
	ErrInvalidTarget      = errors.New("invalid Dragon Nest process target")
	ErrNotFound           = errors.New("Dragon Nest process not found")
	ErrMultiple           = errors.New("multiple Dragon Nest processes found")
	ErrAccessDenied       = errors.New("Dragon Nest process access denied")
	ErrTargetChanged      = errors.New("Dragon Nest process target changed")
	ErrTerminationTimeout = errors.New("Dragon Nest process termination timed out")
	ErrLaunchPathRequired = errors.New("process launch path is required")
	ErrLaunchNotFound     = errors.New("process launch application not found")
)

type Info struct {
	PID  uint32 `json:"pid"`
	Name string `json:"name"`
	// Platform.List leaves Path empty when inspection is denied; Service.List
	// rejects inaccessible game candidates before they reach the application.
	Path string `json:"path"`
}

type Target struct {
	PID  uint32 `json:"pid"`
	Name string `json:"name"`
	Path string `json:"path"`
}

type Platform interface {
	List() ([]Info, error)
	Terminate(target Target) error
	Launch(path string) error
	ValidateLauncherPath(path string) (string, error)
}

type Service interface {
	List() ([]Info, error)
	Terminate(target Target) (Info, error)
	TerminateConfigured(path string) (Info, error)
	LaunchConfigured(path string) error
	ValidateLauncherPath(path string) (string, error)
	Health() error
}
