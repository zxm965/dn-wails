package storage

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sync"
)

var validKeyPattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]*$`)

// FileStore stores each key as an individual JSON file under the application config directory.
type FileStore struct {
	directory string
	mu        sync.RWMutex
}

func NewFileStore(appName string) (*FileStore, error) {
	configDirectory, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("resolve user config directory: %w", err)
	}

	return NewFileStoreAt(filepath.Join(configDirectory, appName)), nil
}

func NewFileStoreAt(directory string) *FileStore {
	return &FileStore{directory: filepath.Clean(directory)}
}

func (s *FileStore) Load(key string) ([]byte, error) {
	path, err := s.Location(key)
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("read stored value %q: %w", key, err)
	}

	return data, nil
}

func (s *FileStore) Save(key string, data []byte) error {
	path, err := s.Location(key)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.directory, 0o700); err != nil {
		return fmt.Errorf("create storage directory: %w", err)
	}

	temporaryFile, err := os.CreateTemp(s.directory, key+"-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary stored value %q: %w", key, err)
	}
	temporaryPath := temporaryFile.Name()
	defer os.Remove(temporaryPath)

	if err := temporaryFile.Chmod(0o600); err != nil {
		temporaryFile.Close()
		return fmt.Errorf("set stored value permissions %q: %w", key, err)
	}
	if _, err := temporaryFile.Write(data); err != nil {
		temporaryFile.Close()
		return fmt.Errorf("write stored value %q: %w", key, err)
	}
	if err := temporaryFile.Sync(); err != nil {
		temporaryFile.Close()
		return fmt.Errorf("sync stored value %q: %w", key, err)
	}
	if err := temporaryFile.Close(); err != nil {
		return fmt.Errorf("close stored value %q: %w", key, err)
	}

	if err := os.Rename(temporaryPath, path); err != nil {
		backupPath := path + ".backup"
		if removeErr := os.Remove(backupPath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return fmt.Errorf("remove stale backup for %q: %w", key, removeErr)
		}

		hadPreviousValue := true
		if backupErr := os.Rename(path, backupPath); errors.Is(backupErr, os.ErrNotExist) {
			hadPreviousValue = false
		} else if backupErr != nil {
			return fmt.Errorf("backup stored value %q: %w", key, backupErr)
		}

		if retryErr := os.Rename(temporaryPath, path); retryErr != nil {
			if hadPreviousValue {
				_ = os.Rename(backupPath, path)
			}
			return fmt.Errorf("replace stored value %q: %w", key, retryErr)
		}
		if hadPreviousValue {
			_ = os.Remove(backupPath)
		}
	}

	return nil
}

func (s *FileStore) Delete(key string) error {
	path, err := s.Location(key)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("delete stored value %q: %w", key, err)
	}

	return nil
}

func (s *FileStore) Location(key string) (string, error) {
	if !validKeyPattern.MatchString(key) {
		return "", ErrInvalidKey
	}

	return filepath.Join(s.directory, key+".json"), nil
}
