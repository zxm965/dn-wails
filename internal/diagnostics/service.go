package diagnostics

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

const maxLogSize = 5 * 1024 * 1024

type Info struct {
	AppName      string
	AppVersion   string
	GoVersion    string
	OS           string
	Arch         string
	StartedAt    time.Time
	LogDirectory string
	LogFile      string
}

type Service struct {
	info Info

	mu             sync.Mutex
	file           *os.File
	previousWriter io.Writer
}

func NewService(appName string, appVersion string, startedAt time.Time) (*Service, error) {
	cacheDirectory, err := os.UserCacheDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user cache directory: %w", err)
	}

	return NewServiceAt(appName, appVersion, startedAt, filepath.Join(cacheDirectory, appName, "logs")), nil
}

func NewServiceAt(appName string, appVersion string, startedAt time.Time, logDirectory string) *Service {
	return &Service{
		info: Info{
			AppName:      appName,
			AppVersion:   appVersion,
			GoVersion:    runtime.Version(),
			OS:           runtime.GOOS,
			Arch:         runtime.GOARCH,
			StartedAt:    startedAt,
			LogDirectory: logDirectory,
			LogFile:      filepath.Join(logDirectory, "app.log"),
		},
	}
}

func (s *Service) Initialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.file != nil {
		return nil
	}
	if err := os.MkdirAll(s.info.LogDirectory, 0o700); err != nil {
		return fmt.Errorf("create log directory: %w", err)
	}
	if err := rotateIfNeeded(s.info.LogFile); err != nil {
		return err
	}

	file, err := os.OpenFile(s.info.LogFile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open application log: %w", err)
	}

	s.previousWriter = log.Writer()
	s.file = file
	log.SetOutput(io.MultiWriter(s.previousWriter, file))
	log.Printf("application diagnostics started: version=%s os=%s arch=%s", s.info.AppVersion, s.info.OS, s.info.Arch)

	return nil
}

func (s *Service) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.file == nil {
		return nil
	}

	log.Printf("application diagnostics stopped")
	if s.previousWriter != nil {
		log.SetOutput(s.previousWriter)
	}
	err := s.file.Close()
	s.file = nil
	return err
}

func (s *Service) Info() Info {
	return s.info
}

func rotateIfNeeded(logFile string) error {
	info, err := os.Stat(logFile)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect application log: %w", err)
	}
	if info.Size() < maxLogSize {
		return nil
	}

	backupFile := logFile + ".1"
	if err := os.Remove(backupFile); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove previous log backup: %w", err)
	}
	if err := os.Rename(logFile, backupFile); err != nil {
		return fmt.Errorf("rotate application log: %w", err)
	}
	return nil
}
