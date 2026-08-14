package installation

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"cull-pear/internal/storage"
)

func TestServiceCreatesAndPreservesInstallationIdentityAcrossVersions(t *testing.T) {
	t.Parallel()

	store := storage.NewFileStoreAt(t.TempDir())
	createdAt := time.Date(2026, time.August, 13, 8, 30, 0, 0, time.UTC)
	first := NewService(store, "1.0.0")
	first.now = func() time.Time { return createdAt }
	first.random = strings.NewReader("0123456789abcdef")

	if err := first.Initialize(); err != nil {
		t.Fatalf("initialize first installation identity: %v", err)
	}
	installationID, err := first.InstallationID()
	if err != nil {
		t.Fatalf("read first installation ID: %v", err)
	}
	if !installationIDPattern.MatchString(installationID) {
		t.Fatalf("expected UUID v4 installation ID, got %q", installationID)
	}

	second := NewService(store, "1.1.0")
	if err := second.Initialize(); err != nil {
		t.Fatalf("initialize upgraded installation identity: %v", err)
	}
	reloadedID, err := second.InstallationID()
	if err != nil {
		t.Fatalf("read upgraded installation ID: %v", err)
	}
	if reloadedID != installationID {
		t.Fatalf("expected installation ID %q to be preserved, got %q", installationID, reloadedID)
	}
	if second.CurrentVersion() != "1.1.0" {
		t.Fatalf("unexpected current version %q", second.CurrentVersion())
	}

	data, err := store.Load(storageKey)
	if err != nil {
		t.Fatalf("load stored installation identity: %v", err)
	}
	var identity Identity
	if err := json.Unmarshal(data, &identity); err != nil {
		t.Fatalf("decode stored installation identity: %v", err)
	}
	if identity.CreatedAt != createdAt {
		t.Fatalf("unexpected creation time %s", identity.CreatedAt)
	}
	if identity.FirstInstallVersion != "1.0.0" || identity.LastSeenVersion != "1.1.0" {
		t.Fatalf("unexpected stored version history: %+v", identity)
	}
}

func TestServiceRejectsInvalidStoredInstallationIdentity(t *testing.T) {
	t.Parallel()

	store := storage.NewFileStoreAt(t.TempDir())
	if err := store.Save(storageKey, []byte(`{
  "schemaVersion": 1,
  "installationId": "not-a-uuid",
  "createdAt": "2026-08-13T08:30:00Z",
  "firstInstallVersion": "1.0.0",
  "lastSeenVersion": "1.0.0"
}`)); err != nil {
		t.Fatalf("save invalid installation identity: %v", err)
	}

	service := NewService(store, "1.0.0")
	if err := service.Initialize(); !errors.Is(err, ErrInvalidIdentity) {
		t.Fatalf("expected invalid identity error, got %v", err)
	}
	if _, err := service.InstallationID(); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected identity to remain unavailable, got %v", err)
	}
}

func TestServiceDoesNotExposeEphemeralIdentityWhenPersistenceFails(t *testing.T) {
	t.Parallel()

	service := NewService(failingStore{}, "1.0.0")
	service.random = strings.NewReader("0123456789abcdef")

	if err := service.Initialize(); err == nil {
		t.Fatal("expected persistence failure")
	}
	if _, err := service.InstallationID(); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected identity to remain unavailable, got %v", err)
	}
}

type failingStore struct{}

func (failingStore) Load(string) ([]byte, error)     { return nil, storage.ErrNotFound }
func (failingStore) Save(string, []byte) error       { return errors.New("disk unavailable") }
func (failingStore) Delete(string) error             { return nil }
func (failingStore) Location(string) (string, error) { return "", nil }
