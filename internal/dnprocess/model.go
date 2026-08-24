package dnprocess

import "errors"

var (
	ErrUnavailable   = errors.New("Dragon Nest process control is unavailable")
	ErrInvalidTarget = errors.New("invalid Dragon Nest process target")
	ErrNotFound      = errors.New("Dragon Nest process not found")
	ErrMultiple      = errors.New("multiple Dragon Nest processes found")
	ErrAccessDenied  = errors.New("Dragon Nest process access denied")
	ErrTargetChanged = errors.New("Dragon Nest process target changed")
)

type Info struct {
	PID  uint32 `json:"pid"`
	Name string `json:"name"`
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
}

type Service interface {
	List() ([]Info, error)
	Terminate(target Target) (Info, error)
	TerminateConfigured(path string) (Info, error)
	Health() error
}
