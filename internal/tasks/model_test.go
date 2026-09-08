package tasks

import (
	"errors"
	"testing"
)

func TestNormalizeTaskInput(t *testing.T) {
	t.Parallel()

	normalized, err := normalizeTaskInput(TaskInput{
		ListID:      2,
		Title:       "  准备发布  ",
		ScheduledAt: "2026-09-08T08:30:00+08:00",
		Repeat:      RepeatRule{Frequency: "weekly", Interval: 2, EndMode: "count", Count: 4},
	})
	if err != nil {
		t.Fatalf("normalize task: %v", err)
	}
	if normalized.Title != "准备发布" || normalized.ScheduledAt != "2026-09-08T00:30:00Z" {
		t.Fatalf("unexpected normalized task: %#v", normalized)
	}
}

func TestNormalizeTaskRejectsInvalidRepeatCombinations(t *testing.T) {
	t.Parallel()

	_, err := normalizeTaskInput(TaskInput{
		ListID: 1, ParentID: 2, Title: "子任务",
		ScheduledAt: "2026-09-08T00:00:00Z",
		Repeat:      RepeatRule{Frequency: "daily", Interval: 1},
	})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected conflict for repeating subtask, got %v", err)
	}

	_, err = normalizeTaskInput(TaskInput{
		ListID: 1, Title: "无日期重复任务",
		Repeat: RepeatRule{Frequency: "daily", Interval: 1},
	})
	if !errors.Is(err, ErrInvalidData) {
		t.Fatalf("expected invalid data for undated repeat, got %v", err)
	}
}

func TestAdvanceTimestamp(t *testing.T) {
	t.Parallel()

	next, err := advanceTimestamp("2026-09-08T00:30:00Z", RepeatRule{Frequency: "weekly", Interval: 2}, "Asia/Shanghai")
	if err != nil {
		t.Fatalf("advance timestamp: %v", err)
	}
	if next != "2026-09-22T00:30:00Z" {
		t.Fatalf("unexpected next timestamp: %s", next)
	}

	monthEnd, err := advanceTimestamp("2027-01-31T01:00:00Z", RepeatRule{Frequency: "monthly", Interval: 1}, "UTC")
	if err != nil || monthEnd != "2027-02-28T01:00:00Z" {
		t.Fatalf("unexpected month-end occurrence: %s (%v)", monthEnd, err)
	}

	dst, err := advanceTimestamp("2026-03-07T14:00:00Z", RepeatRule{Frequency: "daily", Interval: 1}, "America/New_York")
	if err != nil || dst != "2026-03-08T13:00:00Z" {
		t.Fatalf("unexpected daylight-saving occurrence: %s (%v)", dst, err)
	}
}
