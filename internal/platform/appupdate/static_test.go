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

func TestStaticSourceLoadsLatestRelease(t *testing.T) {
	t.Parallel()

	var server *httptest.Server
	server = httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/dn-wails/latest.json":
			if request.Method != http.MethodGet {
				t.Fatalf("expected GET manifest request, got %s", request.Method)
			}
			response.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(response, `{
  "schemaVersion": 1,
  "repository": "zxm965/dn-wails",
  "version": "1.2.0",
  "name": "Version 1.2.0",
  "notes": "Notes",
  "releaseUrl": %q,
  "publishedAt": "2026-07-31T02:30:00Z",
  "assets": [{
    "name": "dn-wails-darwin-universal.zip",
    "url": %q,
    "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "size": 100
  }]
}`, server.URL+"/dn-wails/v1.2.0/", server.URL+"/dn-wails/v1.2.0/dn-wails-darwin-universal.zip")
		default:
			t.Fatalf("unexpected request path %q", request.URL.Path)
		}
	}))
	defer server.Close()

	source := mustStaticSource(t, server.Client(), server.URL+"/dn-wails/", "zxm965/dn-wails.git")
	release, err := source.Latest(context.Background())
	if err != nil {
		t.Fatalf("load latest release: %v", err)
	}
	if release.Version != "1.2.0" || len(release.Assets) != 1 || release.Assets[0].Size != 100 {
		t.Fatalf("unexpected release: %+v", release)
	}
	if release.URL != server.URL+"/dn-wails/v1.2.0/" || release.Notes != "Notes" {
		t.Fatalf("unexpected release metadata: %+v", release)
	}
}

func TestStaticSourceRejectsMismatchedManifest(t *testing.T) {
	t.Parallel()

	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		fmt.Fprintf(response, `{
  "schemaVersion": 1,
  "repository": "other/repository",
  "version": "1.2.0",
  "releaseUrl": "https://updates.example/dn-wails/v1.2.0/",
  "assets": [{
    "name": "dn-wails-darwin-universal.zip",
    "url": "https://updates.example/dn-wails/v1.2.0/dn-wails-darwin-universal.zip",
    "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "size": 100
  }]
}`)
	}))
	defer server.Close()

	source := mustStaticSource(t, server.Client(), server.URL+"/dn-wails", "zxm965/dn-wails")
	_, err := source.Latest(context.Background())
	if err == nil || !strings.Contains(err.Error(), "repository mismatch") {
		t.Fatalf("expected manifest repository mismatch, got %v", err)
	}
}

func TestStaticSourceReportsMissingRelease(t *testing.T) {
	t.Parallel()

	server := httptest.NewTLSServer(http.NotFoundHandler())
	defer server.Close()
	source := mustStaticSource(t, server.Client(), server.URL+"/dn-wails", "zxm965/dn-wails")
	_, err := source.Latest(context.Background())
	if !errors.Is(err, coreupdate.ErrNoRelease) {
		t.Fatalf("expected no release error, got %v", err)
	}
}

func TestStaticSourceRejectsUnsafeManifestAssets(t *testing.T) {
	t.Parallel()

	source := mustStaticSource(t, nil, "https://updates.example/dn-wails", "zxm965/dn-wails")
	baseAsset := releaseManifestAsset{
		Name:   "dn-wails-darwin-universal.zip",
		URL:    "https://updates.example/dn-wails/v1.2.0/dn-wails-darwin-universal.zip",
		Digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:   100,
	}
	baseManifest := releaseManifest{
		SchemaVersion: 1,
		Repository:    "zxm965/dn-wails",
		Version:       "1.2.0",
		ReleaseURL:    "https://updates.example/dn-wails/v1.2.0/",
		Assets:        []releaseManifestAsset{baseAsset},
	}

	tests := map[string]func(*releaseManifest){
		"path traversal": func(manifest *releaseManifest) {
			manifest.Assets[0].Name = ".."
		},
		"duplicate asset": func(manifest *releaseManifest) {
			manifest.Assets = append(manifest.Assets, manifest.Assets[0])
		},
		"external URL": func(manifest *releaseManifest) {
			manifest.Assets[0].URL = "https://example.com/update.zip"
		},
		"missing digest": func(manifest *releaseManifest) {
			manifest.Assets[0].Digest = ""
		},
		"empty asset": func(manifest *releaseManifest) {
			manifest.Assets[0].Size = 0
		},
	}
	for name, mutate := range tests {
		name, mutate := name, mutate
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			manifest := baseManifest
			manifest.Assets = append([]releaseManifestAsset(nil), baseManifest.Assets...)
			mutate(&manifest)
			if _, err := source.releaseFromManifest(manifest); err == nil {
				t.Fatal("expected unsafe manifest to be rejected")
			}
		})
	}
}

func TestStaticSourceDownloadsAndVerifiesAsset(t *testing.T) {
	t.Parallel()

	payload := []byte("verified update")
	digest := sha256.Sum256(payload)
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Header().Set("Content-Length", fmt.Sprintf("%d", len(payload)))
		response.Write(payload)
	}))
	defer server.Close()

	source := mustStaticSource(t, server.Client(), server.URL+"/dn-wails", "zxm965/dn-wails")
	destination := filepath.Join(t.TempDir(), "update.zip")
	err := source.Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: server.URL + "/dn-wails/v1.2.0/update.zip",
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

func TestStaticSourceRejectsDigestMismatchAndExternalURL(t *testing.T) {
	t.Parallel()

	payload := []byte("tampered update")
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.Write(payload)
	}))
	defer server.Close()

	source := mustStaticSource(t, server.Client(), server.URL+"/dn-wails", "zxm965/dn-wails")
	destination := filepath.Join(t.TempDir(), "update.zip")
	err := source.Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: server.URL + "/dn-wails/v1.2.0/update.zip",
		Digest:      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:        int64(len(payload)),
	}, destination)
	if err == nil {
		t.Fatal("expected digest mismatch")
	}
	if _, statErr := os.Stat(destination); !os.IsNotExist(statErr) {
		t.Fatalf("expected invalid download to be removed, got %v", statErr)
	}

	err = source.Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: "https://example.com/update.zip",
		Digest:      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:        int64(len(payload)),
	}, filepath.Join(t.TempDir(), "external.zip"))
	if err == nil || !strings.Contains(err.Error(), "outside configured update source") {
		t.Fatalf("expected external URL rejection, got %v", err)
	}
}

func mustStaticSource(t *testing.T, client *http.Client, baseURL string, repository string) *StaticSource {
	t.Helper()
	source, err := NewStaticSource(client, baseURL, repository)
	if err != nil {
		t.Fatalf("create static update source: %v", err)
	}
	return source
}
