package dnprocess

import (
	"fmt"
	"strings"
)

var knownProcessNames = map[string]struct{}{
	"dragonnest.exe":     {},
	"dragonnest_x64.exe": {},
}

type service struct {
	platform Platform
}

func NewService(platform Platform) Service {
	return &service{platform: platform}
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
		if isDragonNestProcess(item) {
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
	if target.PID == 0 || target.Name == "" || target.Path == "" {
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
			if strings.EqualFold(item.Path, path) {
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

func isDragonNestProcess(item Info) bool {
	name := strings.ToLower(strings.TrimSpace(item.Name))
	if _, ok := knownProcessNames[name]; ok {
		return true
	}
	return false
}
