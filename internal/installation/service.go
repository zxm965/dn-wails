package installation

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"sync"
	"time"

	"dn-wails/internal/storage"
)

const storageKey = "installation"

var (
	ErrInvalidIdentity = errors.New("invalid installation identity")
	ErrNotInitialized  = errors.New("installation identity is not initialized")

	installationIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	appVersionPattern     = regexp.MustCompile(`^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-dev)?$`)
)

type Service struct {
	store          storage.Store
	currentVersion string
	now            func() time.Time
	random         io.Reader

	mu       sync.RWMutex
	identity *Identity
}

func NewService(store storage.Store, currentVersion string) *Service {
	return &Service{
		store:          store,
		currentVersion: strings.TrimSpace(currentVersion),
		now:            time.Now,
		random:         rand.Reader,
	}
}

func (s *Service) Initialize() error {
	if s.store == nil {
		return fmt.Errorf("initialize installation identity: storage is unavailable")
	}
	if !validAppVersion(s.currentVersion) {
		return fmt.Errorf("%w: invalid current application version", ErrInvalidIdentity)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := s.store.Load(storageKey)
	if errors.Is(err, storage.ErrNotFound) {
		return s.createLocked()
	}
	if err != nil {
		return fmt.Errorf("load installation identity: %w", err)
	}

	var identity Identity
	if err := json.Unmarshal(data, &identity); err != nil {
		return fmt.Errorf("decode installation identity: %w", err)
	}
	if err := validate(identity); err != nil {
		return err
	}

	s.identity = &identity
	if identity.LastSeenVersion == s.currentVersion {
		return nil
	}

	identity.LastSeenVersion = s.currentVersion
	if err := s.persist(identity); err != nil {
		return err
	}
	s.identity = &identity
	return nil
}

func (s *Service) InstallationID() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.identity == nil {
		return "", ErrNotInitialized
	}
	return s.identity.InstallationID, nil
}

func (s *Service) CurrentVersion() string {
	return s.currentVersion
}

func (s *Service) createLocked() error {
	installationID, err := generateInstallationID(s.random)
	if err != nil {
		return fmt.Errorf("generate installation identity: %w", err)
	}

	identity := Identity{
		SchemaVersion:       CurrentSchemaVersion,
		InstallationID:      installationID,
		CreatedAt:           s.now().UTC(),
		FirstInstallVersion: s.currentVersion,
		LastSeenVersion:     s.currentVersion,
	}
	if err := s.persist(identity); err != nil {
		return err
	}

	s.identity = &identity
	return nil
}

func (s *Service) persist(identity Identity) error {
	data, err := json.MarshalIndent(identity, "", "  ")
	if err != nil {
		return fmt.Errorf("encode installation identity: %w", err)
	}
	if err := s.store.Save(storageKey, data); err != nil {
		return fmt.Errorf("persist installation identity: %w", err)
	}
	return nil
}

func validate(identity Identity) error {
	if identity.SchemaVersion != CurrentSchemaVersion {
		return fmt.Errorf("%w: unsupported schema version %d", ErrInvalidIdentity, identity.SchemaVersion)
	}
	if !installationIDPattern.MatchString(identity.InstallationID) {
		return fmt.Errorf("%w: invalid installation ID", ErrInvalidIdentity)
	}
	if identity.CreatedAt.IsZero() {
		return fmt.Errorf("%w: missing creation time", ErrInvalidIdentity)
	}
	if !validAppVersion(identity.FirstInstallVersion) {
		return fmt.Errorf("%w: invalid first install version", ErrInvalidIdentity)
	}
	if !validAppVersion(identity.LastSeenVersion) {
		return fmt.Errorf("%w: invalid last seen version", ErrInvalidIdentity)
	}
	return nil
}

func validAppVersion(value string) bool {
	return len(value) <= 64 && appVersionPattern.MatchString(value)
}

func generateInstallationID(random io.Reader) (string, error) {
	value := make([]byte, 16)
	if _, err := io.ReadFull(random, value); err != nil {
		return "", err
	}

	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf(
		"%x-%x-%x-%x-%x",
		value[0:4],
		value[4:6],
		value[6:8],
		value[8:10],
		value[10:16],
	), nil
}
