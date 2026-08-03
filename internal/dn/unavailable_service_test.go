package dn

import (
	"errors"
	"testing"
)

func TestUnavailableServiceDoesNotFailApplicationLifecycle(t *testing.T) {
	t.Parallel()

	service := NewUnavailableService()
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize unavailable service: %v", err)
	}
	if err := service.Close(); err != nil {
		t.Fatalf("close unavailable service: %v", err)
	}
}

func TestUnavailableServiceRejectsDnOperations(t *testing.T) {
	t.Parallel()

	service := NewUnavailableService()
	if _, err := service.AuthState(); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected auth state to report unavailable, got %v", err)
	}
	if _, err := service.Login(LoginInput{}); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected login to report unavailable, got %v", err)
	}
	if _, err := service.ListWeeklyPlans(WeeklyPlanQuery{}); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected weekly plans to report unavailable, got %v", err)
	}
}
