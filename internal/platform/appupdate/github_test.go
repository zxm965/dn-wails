package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	coreupdate "dn-wails/internal/appupdate"
)

func TestGitHubSourceLoadsLatestRelease(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/repos/zxm965/dn-wails/releases/latest" {
			t.Fatalf("unexpected request path %q", request.URL.Path)
		}
		if request.Header.Get("X-GitHub-Api-Version") != githubAPIVersion {
			t.Fatalf("missing API version header")
		}
		response.Header().Set("Content-Type", "application/json")
		fmt.Fprint(response, `{
  "tag_name": "v1.2.0",
  "name": "Version 1.2.0",
  "body": "Notes",
  "html_url": "https://github.com/zxm965/dn-wails/releases/tag/v1.2.0",
  "published_at": "2026-07-31T02:30:00Z",
  "assets": [{
    "name": "dn-wails-darwin-universal.zip",
    "browser_download_url": "https://example.com/update.zip",
    "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "size": 100
  }]
}`)
	}))
	defer server.Close()

	source := NewGitHubSource(server.Client())
	source.apiBaseURL = server.URL
	release, err := source.Latest(context.Background(), "zxm965/dn-wails.git")
	if err != nil {
		t.Fatalf("load latest release: %v", err)
	}
	if release.Version != "v1.2.0" || len(release.Assets) != 1 || release.Assets[0].Size != 100 {
		t.Fatalf("unexpected release: %+v", release)
	}
}

func TestGitHubSourceDownloadsAndVerifiesAsset(t *testing.T) {
	t.Parallel()

	payload := []byte("verified update")
	digest := sha256.Sum256(payload)
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Header().Set("Content-Length", fmt.Sprintf("%d", len(payload)))
		response.Write(payload)
	}))
	defer server.Close()

	source := NewGitHubSource(server.Client())
	destination := filepath.Join(t.TempDir(), "update.zip")
	err := source.Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: server.URL,
		Digest:      "sha256:" + hex.EncodeToString(digest[:]),
		Size:        int64(len(payload)),
	}, destination)
	if err != nil {
		t.Fatalf("download update: %v", err)
	}
	data, err := os.ReadFile(destination)
	if err != nil {
		t.Fatalf("read downloaded update: %v", err)
	}
	if string(data) != string(payload) {
		t.Fatalf("unexpected downloaded content %q", data)
	}
}

func TestGitHubSourceRejectsDigestMismatch(t *testing.T) {
	t.Parallel()

	payload := []byte("tampered update")
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Write(payload)
	}))
	defer server.Close()

	destination := filepath.Join(t.TempDir(), "update.zip")
	err := NewGitHubSource(server.Client()).Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: server.URL,
		Digest:      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:        int64(len(payload)),
	}, destination)
	if err == nil {
		t.Fatal("expected digest mismatch")
	}
	if _, statErr := os.Stat(destination); !os.IsNotExist(statErr) {
		t.Fatalf("expected invalid download to be removed, got %v", statErr)
	}
}
