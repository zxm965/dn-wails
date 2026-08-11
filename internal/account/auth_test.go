package account

import (
	"errors"
	"testing"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	t.Parallel()

	hash, err := hashPassword("password-123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if !verifyPassword("password-123", hash) {
		t.Fatal("expected password to match generated hash")
	}
	if verifyPassword("different-password", hash) {
		t.Fatal("different password must not match generated hash")
	}
}

func TestAccountValidation(t *testing.T) {
	t.Parallel()

	if err := validatePassword("short"); !errors.Is(err, ErrInvalidData) {
		t.Fatalf("expected short password to be rejected, got %v", err)
	}
	if !validEmail("user@example.com") || validEmail("invalid-email") {
		t.Fatal("email validation returned an unexpected result")
	}
	if err := validateAvatar("javascript:alert(1)"); !errors.Is(err, ErrInvalidData) {
		t.Fatalf("expected unsafe avatar URL to be rejected, got %v", err)
	}
}

func TestUnavailableServiceKeepsLifecycleAvailable(t *testing.T) {
	t.Parallel()

	service := NewUnavailableService()
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize unavailable account service: %v", err)
	}
	if _, err := service.AuthState(); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected unavailable auth state, got %v", err)
	}
	if err := service.Close(); err != nil {
		t.Fatalf("close unavailable account service: %v", err)
	}
}
