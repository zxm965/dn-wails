package dn

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestWeeklyCommissionBoundsFollowLinkedTasks(t *testing.T) {
	for _, ark := range []bool{false, true} {
		for _, nightmare := range []bool{false, true} {
			completed := 0
			if ark {
				completed++
			}
			if nightmare {
				completed++
			}
			for count := -1; count <= 7; count++ {
				got, err := normalizeWeeklyCommissionCount(count, ark, nightmare)
				if count < 0 || count > 6 {
					if !errors.Is(err, ErrInvalidData) {
						t.Fatalf("count %d accepted", count)
					}
					continue
				}
				want := min(max(count, 2-completed), 6-completed)
				if err != nil || got != want {
					t.Fatalf("count=%d ark=%t nightmare=%t: %d %v, want %d", count, ark, nightmare, got, err, want)
				}
			}
		}
	}
}

func TestMessageInputValidation(t *testing.T) {
	now := time.Date(2026, 10, 14, 0, 0, 0, 0, time.UTC)
	valid := SiteMessageInput{Title: " 公告 ", Level: " info ", ActionURL: " https://example.com/news "}
	normalized, err := normalizeSiteMessageInput(valid, now)
	if err != nil || normalized.Title != "公告" || normalized.ActionTarget != MessageTargetSelf || normalized.PublishedAt != now.Format(time.RFC3339) {
		t.Fatalf("normalize: %+v %v", normalized, err)
	}
	for _, tc := range []struct {
		name   string
		change func(*SiteMessageInput)
	}{
		{"empty title", func(v *SiteMessageInput) { v.Title = " " }},
		{"long title", func(v *SiteMessageInput) { v.Title = strings.Repeat("文", 201) }},
		{"unknown level", func(v *SiteMessageInput) { v.Level = "fatal" }},
		{"script URL", func(v *SiteMessageInput) { v.ActionURL = "javascript:alert(1)" }},
		{"file URL", func(v *SiteMessageInput) { v.ActionURL = "file:///tmp/test" }},
		{"invalid target", func(v *SiteMessageInput) { v.ActionTarget = "_parent" }},
		{"bad timestamp", func(v *SiteMessageInput) { v.PublishedAt = "yesterday" }},
		{"expired", func(v *SiteMessageInput) { v.ExpiresAt = now.Format(time.RFC3339) }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			input := valid
			tc.change(&input)
			if _, err := normalizeSiteMessageInput(input, now); !errors.Is(err, ErrInvalidData) {
				t.Fatalf("invalid input accepted: %v", err)
			}
		})
	}
}

func TestPaginationBounds(t *testing.T) {
	items := []int{1, 2, 3, 4, 5}
	got, meta := paginate(items, 99, 2)
	if !reflect.DeepEqual(got, []int{5}) || meta.Page != 3 || meta.Total != 5 || meta.TotalPages != 3 {
		t.Fatalf("last page: %v %+v", got, meta)
	}
	got, meta = paginate(items, 0, 0)
	if !reflect.DeepEqual(got, items) || meta.Page != 1 || meta.PageSize != 20 {
		t.Fatalf("defaults: %v %+v", got, meta)
	}
	_, meta = paginate(items, 1, 500)
	if meta.PageSize != 100 {
		t.Fatalf("unbounded page size: %+v", meta)
	}
	got, meta = paginate([]int{}, 1, 20)
	if len(got) != 0 || meta.TotalPages != 0 {
		t.Fatalf("empty page: %v %+v", got, meta)
	}
}
