package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	coreupdate "cull-pear/internal/appupdate"
)

func newTestEndpointSource(t *testing.T, client *http.Client, identity ClientIdentity) *EndpointSource {
	t.Helper()
	source := NewEndpointSource(client, identity)
	source.cacheDirectory = t.TempDir()
	return source
}

func testDownloadAsset(url, payload string) coreupdate.Asset {
	digest := sha256.Sum256([]byte(payload))
	return coreupdate.Asset{Name: "update.zip", DownloadURL: url, Size: int64(len(payload)), Digest: "sha256:" + hex.EncodeToString(digest[:])}
}

func seedDownloadCache(t *testing.T, source *EndpointSource, asset coreupdate.Asset, data string) string {
	t.Helper()
	path, err := source.downloadCachePath(asset)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func assertDownloadedFile(t *testing.T, destination, payload, cachePath string) {
	t.Helper()
	data, err := os.ReadFile(destination)
	if err != nil || string(data) != payload {
		t.Fatalf("unexpected installed bytes %q, error %v", data, err)
	}
	if _, err := os.Stat(cachePath); !os.IsNotExist(err) {
		t.Fatalf("completed cache must be removed, got %v", err)
	}
}

func TestDownloadResumesInterruptedBodyAcrossSourceInstances(t *testing.T) {
	t.Parallel()
	const payload = "a verified resumable installer"
	const offset = 10
	var calls atomic.Int32
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		call := calls.Add(1)
		if r.Header.Get("Accept-Encoding") != "identity" || r.Header.Get("X-Install-ID") == "" {
			t.Error("downloads must preserve byte offsets and installation identity")
		}
		if call == 1 {
			if r.Header.Get("Range") != "" {
				t.Error("initial download must not request a range")
			}
			w.Header().Set("Content-Length", fmt.Sprint(len(payload)))
			io.WriteString(w, payload[:offset])
			return // Deliberately end the response before its declared length.
		}
		if r.Header.Get("Range") != fmt.Sprintf("bytes=%d-", offset) {
			t.Errorf("unexpected resume range: %q", r.Header.Get("Range"))
		}
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", offset, len(payload)-1, len(payload)))
		w.Header().Set("Content-Length", fmt.Sprint(len(payload)-offset))
		w.WriteHeader(http.StatusPartialContent)
		io.WriteString(w, payload[offset:])
	}))
	defer server.Close()
	source := newTestEndpointSource(t, server.Client(), validClientIdentity())
	asset := testDownloadAsset(server.URL, payload)
	firstDestination := filepath.Join(t.TempDir(), "first.zip")
	if err := source.DownloadWithProgress(context.Background(), asset, firstDestination, nil); err == nil {
		t.Fatal("expected interrupted download")
	}
	if _, err := os.Stat(firstDestination); !os.IsNotExist(err) {
		t.Fatalf("partial data must never be handed to the installer: %v", err)
	}
	cachePath, err := source.downloadCachePath(asset)
	if err != nil {
		t.Fatal(err)
	}
	partial, err := os.ReadFile(cachePath)
	if err != nil || string(partial) != payload[:offset] {
		t.Fatalf("missing persisted prefix: %q, %v", partial, err)
	}
	// Simulate app restart and the service's new temporary installation directory.
	restarted := newTestEndpointSource(t, server.Client(), validClientIdentity())
	restarted.cacheDirectory = source.cacheDirectory
	destination := filepath.Join(t.TempDir(), "resumed.zip")
	var progress []coreupdate.Progress
	if err := restarted.DownloadWithProgress(context.Background(), asset, destination, func(p coreupdate.Progress) {
		progress = append(progress, p)
	}); err != nil {
		t.Fatal(err)
	}
	if len(progress) == 0 || progress[0].DownloadedBytes != offset || progress[len(progress)-1].Percent != 100 {
		t.Fatalf("progress must include the cached prefix: %+v", progress)
	}
	if calls.Load() != 2 {
		t.Fatalf("unexpected request count %d", calls.Load())
	}
	assertDownloadedFile(t, destination, payload, cachePath)
}

func TestDownloadRestartsWhenRangeIsIgnoredOrRejected(t *testing.T) {
	for _, status := range []int{http.StatusOK, http.StatusRequestedRangeNotSatisfiable} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			t.Parallel()
			const payload = "fresh verified installer"
			var calls atomic.Int32
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				call := calls.Add(1)
				if call == 1 && r.Header.Get("Range") != "bytes=5-" {
					t.Errorf("expected cached range, got %q", r.Header.Get("Range"))
				}
				if call == 1 && status == http.StatusRequestedRangeNotSatisfiable {
					w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", len(payload)))
					w.WriteHeader(status)
					return
				}
				if call > 1 && r.Header.Get("Range") != "" {
					t.Error("fallback must clear the range header")
				}
				io.WriteString(w, payload)
			}))
			defer server.Close()
			source := newTestEndpointSource(t, server.Client(), validClientIdentity())
			asset := testDownloadAsset(server.URL, payload)
			cachePath := seedDownloadCache(t, source, asset, "stale")
			destination := filepath.Join(t.TempDir(), "update.zip")
			if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err != nil {
				t.Fatal(err)
			}
			expectedCalls := int32(1)
			if status == http.StatusRequestedRangeNotSatisfiable {
				expectedCalls = 2
			}
			if calls.Load() != expectedCalls {
				t.Fatalf("unexpected requests: %d", calls.Load())
			}
			assertDownloadedFile(t, destination, payload, cachePath)
		})
	}
}

func TestDownloadRejectsInvalidPartialResponsesWithoutAppending(t *testing.T) {
	for _, contentRange := range []string{"", "bytes 0-9/10", "bytes 4-8/10", "bytes 4-9/11", "bytes 4-9/*", "bytes 4-999999999999999999999/10"} {
		t.Run(contentRange, func(t *testing.T) {
			t.Parallel()
			const payload = "0123456789"
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Range", contentRange)
				w.WriteHeader(http.StatusPartialContent)
				io.WriteString(w, payload[4:])
			}))
			defer server.Close()
			source := newTestEndpointSource(t, server.Client(), validClientIdentity())
			asset := testDownloadAsset(server.URL, payload)
			cachePath := seedDownloadCache(t, source, asset, payload[:4])
			destination := filepath.Join(t.TempDir(), "update.zip")
			if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err == nil || !strings.Contains(err.Error(), "Content-Range") {
				t.Fatalf("expected range validation error, got %v", err)
			}
			data, err := os.ReadFile(cachePath)
			if err != nil || string(data) != payload[:4] {
				t.Fatalf("invalid response changed cache: %q, %v", data, err)
			}
			if _, err := os.Stat(destination); !os.IsNotExist(err) {
				t.Fatalf("invalid response produced installer: %v", err)
			}
		})
	}
}

func TestDownloadValidatesCompleteAndOversizedCaches(t *testing.T) {
	const payload = "verified installer"
	for name, cached := range map[string]string{"complete": payload, "corrupt": strings.Repeat("x", len(payload)), "oversized": payload + "extra"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			var calls atomic.Int32
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.Header.Get("Range") != "" {
					t.Error("invalid cache must restart from zero")
				}
				io.WriteString(w, payload)
			}))
			defer server.Close()
			source := newTestEndpointSource(t, server.Client(), validClientIdentity())
			asset := testDownloadAsset(server.URL, payload)
			cachePath := seedDownloadCache(t, source, asset, cached)
			destination := filepath.Join(t.TempDir(), "update.zip")
			if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err != nil {
				t.Fatal(err)
			}
			expectedCalls := int32(1)
			if name == "complete" {
				expectedCalls = 0
			}
			if calls.Load() != expectedCalls {
				t.Fatalf("unexpected requests: %d", calls.Load())
			}
			assertDownloadedFile(t, destination, payload, cachePath)
		})
	}
}

func TestDownloadRejectsCorruptedPrefixAfterResume(t *testing.T) {
	t.Parallel()
	const payload = "verified installer"
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes 4-%d/%d", len(payload)-1, len(payload)))
		w.WriteHeader(http.StatusPartialContent)
		io.WriteString(w, payload[4:])
	}))
	defer server.Close()
	source := newTestEndpointSource(t, server.Client(), validClientIdentity())
	asset := testDownloadAsset(server.URL, payload)
	cachePath := seedDownloadCache(t, source, asset, "BAD!")
	destination := filepath.Join(t.TempDir(), "update.zip")
	if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err == nil || !strings.Contains(err.Error(), "digest mismatch") {
		t.Fatalf("expected full-file digest validation, got %v", err)
	}
	info, err := os.Stat(cachePath)
	if err != nil || info.Size() != 0 {
		t.Fatalf("corrupt cache must be reset, got %v, %v", info, err)
	}
	if _, err := os.Stat(destination); !os.IsNotExist(err) {
		t.Fatalf("corrupt cache produced installer: %v", err)
	}
}

func TestDownloadDoesNotReuseCacheForReplacedAsset(t *testing.T) {
	t.Parallel()
	const payload = "new installer"
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Range") != "" {
			t.Error("changed digest must not reuse the old prefix")
		}
		io.WriteString(w, payload)
	}))
	defer server.Close()
	source := newTestEndpointSource(t, server.Client(), validClientIdentity())
	seedDownloadCache(t, source, testDownloadAsset(server.URL, "old installer"), "old")
	asset := testDownloadAsset(server.URL, payload)
	destination := filepath.Join(t.TempDir(), "update.zip")
	if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err != nil {
		t.Fatal(err)
	}
	cachePath, err := source.downloadCachePath(asset)
	if err != nil {
		t.Fatal(err)
	}
	assertDownloadedFile(t, destination, payload, cachePath)
}

func TestDownloadRejectsEncodedOrOversizedBodies(t *testing.T) {
	for _, scenario := range []string{"encoded", "wrong length", "chunked overflow"} {
		t.Run(scenario, func(t *testing.T) {
			t.Parallel()
			const payload = "valid"
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch scenario {
				case "encoded":
					w.Header().Set("Content-Encoding", "gzip")
					io.WriteString(w, payload)
				case "wrong length":
					w.Header().Set("Content-Length", "10")
					io.WriteString(w, "0123456789")
				case "chunked overflow":
					w.(http.Flusher).Flush()
					io.WriteString(w, payload+"extra")
				}
			}))
			defer server.Close()
			source := newTestEndpointSource(t, server.Client(), validClientIdentity())
			asset := testDownloadAsset(server.URL, payload)
			destination := filepath.Join(t.TempDir(), "update.zip")
			if err := source.DownloadWithProgress(context.Background(), asset, destination, nil); err == nil {
				t.Fatal("expected invalid body to be rejected")
			}
			cachePath, err := source.downloadCachePath(asset)
			if err != nil {
				t.Fatal(err)
			}
			data, err := os.ReadFile(cachePath)
			if err != nil || len(data) != 0 {
				t.Fatalf("invalid response left cached bytes: %q, %v", data, err)
			}
			if _, err := os.Stat(destination); !os.IsNotExist(err) {
				t.Fatalf("invalid response produced installer: %v", err)
			}
		})
	}
}

func TestDownloadDoesNotLoopOnRepeatedRangeRejection(t *testing.T) {
	t.Parallel()
	var calls atomic.Int32
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
	}))
	defer server.Close()
	source := newTestEndpointSource(t, server.Client(), validClientIdentity())
	asset := testDownloadAsset(server.URL, "installer")
	seedDownloadCache(t, source, asset, "in")
	if err := source.DownloadWithProgress(context.Background(), asset, filepath.Join(t.TempDir(), "update.zip"), nil); err == nil {
		t.Fatal("expected repeated 416 to be reported")
	}
	if calls.Load() != 2 {
		t.Fatalf("expected exactly one fallback, got %d requests", calls.Load())
	}
}
