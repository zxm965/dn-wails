package storage

import (
	"errors"
)

var (
	ErrNotFound   = errors.New("stored value not found")
	ErrInvalidKey = errors.New("invalid storage key")
)

// Store persists opaque module data without coupling storage to business models.
type Store interface {
	Load(key string) ([]byte, error)
	Save(key string, data []byte) error
	Delete(key string) error
	Location(key string) (string, error)
}
