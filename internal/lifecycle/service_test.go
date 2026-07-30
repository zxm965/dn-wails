package lifecycle

import (
	"testing"
	"time"
)

func TestServiceTracksLifecycleState(t *testing.T) {
	t.Parallel()

	startedAt := time.Date(2026, time.July, 30, 10, 30, 0, 0, time.UTC)
	service := NewService()
	service.Start(startedAt)
	service.MarkReady()
	service.RecordSecondInstance()

	status := service.Status()
	if !status.StartedAt.Equal(startedAt) || !status.Ready || status.SecondInstanceCount != 1 {
		t.Fatalf("unexpected lifecycle status: %+v", status)
	}

	service.Stop()
	if service.Status().Ready {
		t.Fatal("expected lifecycle to stop being ready")
	}
}
