package dnprocess

import (
	"fmt"
	"strings"
)

var knownProcessNames = map[string]struct{}{
	"dragonnest.exe":       {},
	"dragonnest_x64.exe":   {},
	"dragonnestws_x64.exe": {},
	"dnlauncher.exe":       {},
}

// DetectedLauncherPath returns only an unambiguous launch path from validated candidates.
func DetectedLauncherPath(items []Info) string {
	path := ""
	for _, item := range items {
		var samePath func(string, string) bool
		switch strings.ToLower(item.Name) {
		case "dnlauncher.exe":
			samePath = strings.EqualFold
		case "firefox":
			samePath = func(a, b string) bool { return a == b }
		default:
			continue
		}
		if item.Path == "" {
			continue
		}
		if path != "" && !samePath(path, item.Path) {
			return ""
		}
		path = item.Path
	}
	return path
}

type service struct {
	platform  Platform
	names     map[string]struct{}
	matchPath func(string, string) bool
}

func NewService(platform Platform) Service {
	return &service{platform: platform, names: knownProcessNames, matchPath: strings.EqualFold}
}

// NewFirefoxTestService reuses the process workflow with an isolated macOS test target.
func NewFirefoxTestService(platform Platform) Service {
	return &service{platform: platform, names: map[string]struct{}{"firefox": {}}, matchPath: func(a, b string) bool { return a == b }}
}

func (s *service) List() ([]Info, error) {
	if s.platform == nil {
		return nil, ErrUnavailable
	}
	items, err := s.platform.List()
	if err != nil {
		return nil, err
	}

	result := make([]Info, 0, len(items))
	for _, item := range items {
		if s.acceptsName(item.Name) {
			if item.Path == "" {
				return nil, fmt.Errorf("%w: cannot inspect %s (pid %d)", ErrAccessDenied, item.Name, item.PID)
			}
			result = append(result, item)
		}
	}
	return result, nil
}

func (s *service) Terminate(target Target) (Info, error) {
	if s.platform == nil {
		return Info{}, ErrUnavailable
	}
	target.Name = strings.TrimSpace(target.Name)
	target.Path = strings.TrimSpace(target.Path)
	if target.PID == 0 || !s.acceptsName(target.Name) || target.Path == "" {
		return Info{}, fmt.Errorf("%w: pid, name and path are required", ErrInvalidTarget)
	}
	if err := s.platform.Terminate(target); err != nil {
		return Info{}, err
	}
	return Info{PID: target.PID, Name: target.Name, Path: target.Path}, nil
}

func (s *service) TerminateConfigured(path string) (Info, error) {
	items, err := s.List()
	if err != nil {
		return Info{}, err
	}
	path = strings.TrimSpace(path)
	if path != "" {
		for _, item := range items {
			if s.matchPath(item.Path, path) {
				return s.Terminate(Target{PID: item.PID, Name: item.Name, Path: item.Path})
			}
		}
		return Info{}, fmt.Errorf("%w: configured path %q", ErrNotFound, path)
	}
	if len(items) == 0 {
		return Info{}, ErrNotFound
	}
	if len(items) > 1 {
		return Info{}, fmt.Errorf("%w: %d candidates are running", ErrMultiple, len(items))
	}
	item := items[0]
	return s.Terminate(Target{PID: item.PID, Name: item.Name, Path: item.Path})
}

func (s *service) Health() error {
	if s.platform == nil {
		return ErrUnavailable
	}
	return nil
}

// LaunchConfigured avoids launching while any candidate is running and leaves native path validation to the platform.
func (s *service) LaunchConfigured(path string) error {
	path = strings.TrimSpace(path)
	if len(path) > 32768 || strings.ContainsRune(path, '\x00') {
		return ErrInvalidTarget
	}
	items, err := s.List()
	if err != nil {
		return err
	}
	if len(items) > 0 {
		return nil
	}
	return s.platform.Launch(path)
}

func (s *service) acceptsName(name string) bool {
	_, ok := s.names[strings.ToLower(strings.TrimSpace(name))]
	return ok
}

func (s *service) ValidateLauncherPath(path string) (string, error) {
	if s.platform == nil {
		return "", ErrUnavailable
	}
	path = strings.TrimSpace(path)
	if path == "" || len(path) > 4096 || strings.ContainsAny(path, "\r\n\x00") {
		return "", ErrInvalidTarget
	}
	return s.platform.ValidateLauncherPath(path)
}
