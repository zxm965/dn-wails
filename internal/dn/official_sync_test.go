package dn

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestFetchOfficialNewsParsesCurrentResponse(t *testing.T) {
	list, _ := json.Marshal(officialListPayload{DataList: [][]any{
		{"ID", "header"},
		{12345, "", "", "104", "", "", "0", "1", "维护公告", "", "维护摘要", "", "", "", "2026-10-14 08:00:00", "/news/example.html"},
		{"invalid"},
	}})
	payload, _ := json.Marshal(officialAPIResponse{IsSuccess: true, ReturnObject: string(list)})
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPost || r.URL.String() != officialNewsListURL {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL)
		}
		if err := r.ParseForm(); err != nil || r.Form.Get("CategoryCode") != officialCategories || r.Form.Get("PageSize") != "60" {
			t.Fatalf("unexpected form: %v %v", r.Form, err)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(payload))), Header: make(http.Header)}, nil
	})}
	items, err := fetchOfficialNews(client)
	if err != nil || len(items) != 1 {
		t.Fatalf("fetch: %v %v", items, err)
	}
	item := items[0]
	if item.SourceID != 12345 || item.Title != "维护公告" || !item.IsHot || item.URL != "https://dn.web.sdo.com/news/example.html" || !item.PublishedAt.Equal(time.Date(2026, 10, 14, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("parsed item: %+v", item)
	}
}

func TestFetchOfficialNewsRejectsFailures(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		body   string
	}{
		{"HTTP failure", 503, "unavailable"},
		{"invalid JSON", 200, "{"},
		{"API failure", 200, `{"IsSuccess":false,"Message":"failed"}`},
		{"invalid list", 200, `{"IsSuccess":true,"ReturnObject":"{"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.body))}, nil
			})}
			if _, err := fetchOfficialNews(client); err == nil {
				t.Fatal("expected failure")
			}
		})
	}
}
