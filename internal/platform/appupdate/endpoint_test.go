package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	coreupdate "dn-wails/internal/appupdate"
)

func TestEndpointSourceLoadsGitHubReleaseEndpoint(t *testing.T) {
	t.Parallel()

	var server *httptest.Server
	server = httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/github/releases/latest" || request.Method != http.MethodGet {
			t.Fatalf("unexpected release request: %s %s", request.Method, request.URL.String())
		}
		response.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(response, `{
  "tag_name": "v1.4.0",
  "name": "v1.4.0",
  "body": "Release notes",
  "html_url": "https://github.com/zxm965/dn-wails/releases/tag/v1.4.0",
  "draft": false,
  "prerelease": false,
  "published_at": "2026-08-11T07:57:28Z",
  "assets": [{
    "name": "dn-wails-windows-amd64-installer.exe",
    "browser_download_url": "https://github.com/zxm965/dn-wails/releases/download/v1.4.0/dn-wails-windows-amd64-installer.exe",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "size": 200
  }]
}`)
	}))
	defer server.Close()

	release, err := NewEndpointSource(server.Client()).Latest(context.Background(), server.URL+"/github/releases/latest", "zxm965/dn-wails")
	if err != nil {
		t.Fatalf("load GitHub release: %v", err)
	}
	if release.Version != "1.4.0" || release.Name != "v1.4.0" || release.Notes != "Release notes" {
		t.Fatalf("unexpected release metadata: %+v", release)
	}
	if len(release.Assets) != 1 || release.Assets[0].DownloadURL != "https://gitee.com/zxm965/dn-wails/releases/download/v1.4.0/dn-wails-windows-amd64-installer.exe" {
		t.Fatalf("unexpected release assets: %+v", release.Assets)
	}
}

func TestEndpointSourceRejectsMismatchedGitHubReleaseAsset(t *testing.T) {
	t.Parallel()

	data := []byte(`{
  "tag_name": "v1.4.0",
  "html_url": "https://github.com/zxm965/dn-wails/releases/tag/v1.4.0",
  "draft": false,
  "prerelease": false,
  "assets": [{
    "name": "dn-wails-windows-amd64-installer.exe",
    "browser_download_url": "https://github.com/other/repository/releases/download/v1.4.0/dn-wails-windows-amd64-installer.exe",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "size": 200
  }]
}`)
	_, err := NewEndpointSource(nil).releaseFromMetadata("zxm965/dn-wails", data)
	if err == nil || !strings.Contains(err.Error(), "repository mismatch") {
		t.Fatalf("expected GitHub asset repository mismatch, got %v", err)
	}
}

func TestEndpointSourceRejectsMismatchedGitHubRelease(t *testing.T) {
	t.Parallel()

	var server *httptest.Server
	server = httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		fmt.Fprintf(response, `{
  "tag_name": "v1.4.0",
  "html_url": "https://github.com/other/repository/releases/tag/v1.4.0",
  "draft": false,
  "prerelease": false,
  "assets": [{
    "name": "dn-wails-windows-amd64-installer.exe",
    "browser_download_url": "https://github.com/other/repository/releases/download/v1.4.0/dn-wails-windows-amd64-installer.exe",
    "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "size": 100
  }]
}`)
	}))
	defer server.Close()

	_, err := NewEndpointSource(server.Client()).Latest(context.Background(), server.URL+"/github/releases/latest", "zxm965/dn-wails")
	if err == nil || !strings.Contains(err.Error(), "repository mismatch") {
		t.Fatalf("expected release repository mismatch, got %v", err)
	}
}

func TestEndpointSourceRejectsMissingMetadata(t *testing.T) {
	t.Parallel()

	server := httptest.NewTLSServer(http.NotFoundHandler())
	defer server.Close()
	_, err := NewEndpointSource(server.Client()).Latest(context.Background(), server.URL+"/github/releases/latest", "zxm965/dn-wails")
	if !errors.Is(err, coreupdate.ErrNoRelease) {
		t.Fatalf("expected no release error, got %v", err)
	}
}

func TestEndpointSourceRejectsUnsafeGitHubReleaseAssets(t *testing.T) {
	t.Parallel()

	baseAsset := githubReleaseAsset{
		Name:               "dn-wails-windows-amd64-installer.exe",
		BrowserDownloadURL: "https://github.com/zxm965/dn-wails/releases/download/v1.4.0/dn-wails-windows-amd64-installer.exe",
		Digest:             "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:               100,
	}
	baseRelease := githubRelease{
		TagName: "v1.4.0",
		HTMLURL: "https://github.com/zxm965/dn-wails/releases/tag/v1.4.0",
		Assets:  []githubReleaseAsset{baseAsset},
	}

	tests := map[string]func(*githubRelease){
		"path traversal": func(release *githubRelease) {
			release.Assets[0].Name = ".."
		},
		"duplicate asset": func(release *githubRelease) {
			release.Assets = append(release.Assets, release.Assets[0])
		},
		"external non HTTPS URL": func(release *githubRelease) {
			release.Assets[0].BrowserDownloadURL = "http://github.com/zxm965/dn-wails/releases/download/v1.4.0/update.exe"
		},
		"unsupported host": func(release *githubRelease) {
			release.Assets[0].BrowserDownloadURL = "https://download.example.com/update.exe"
		},
		"missing digest": func(release *githubRelease) {
			release.Assets[0].Digest = ""
		},
		"empty asset": func(release *githubRelease) {
			release.Assets[0].Size = 0
		},
	}
	for name, mutate := range tests {
		name, mutate := name, mutate
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			release := baseRelease
			release.Assets = append([]githubReleaseAsset(nil), baseRelease.Assets...)
			mutate(&release)
			if _, err := releaseFromGitHubRelease("zxm965/dn-wails", release); err == nil {
				t.Fatal("expected unsafe release to be rejected")
			}
		})
	}
}

func TestEndpointSourceDownloadsAndVerifiesAsset(t *testing.T) {
	t.Parallel()

	payload := []byte("verified update")
	digest := sha256.Sum256(payload)
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Header().Set("Content-Length", fmt.Sprintf("%d", len(payload)))
		response.Write(payload)
	}))
	defer server.Close()

	source := NewEndpointSource(server.Client())
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

func TestEndpointSourceRejectsDigestMismatch(t *testing.T) {
	t.Parallel()

	payload := []byte("tampered update")
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Write(payload)
	}))
	defer server.Close()

	destination := filepath.Join(t.TempDir(), "update.zip")
	err := NewEndpointSource(server.Client()).Download(context.Background(), coreupdate.Asset{
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
