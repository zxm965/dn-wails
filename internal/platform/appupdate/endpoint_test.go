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
	"runtime"
	"strings"
	"testing"

	coreupdate "cull-pear/internal/appupdate"
)

type clientIdentityStub struct {
	installationID string
	version        string
	err            error
}

func (s clientIdentityStub) InstallationID() (string, error) {
	return s.installationID, s.err
}

func (s clientIdentityStub) CurrentVersion() string {
	return s.version
}

func validClientIdentity() clientIdentityStub {
	return clientIdentityStub{
		installationID: "123e4567-e89b-42d3-a456-426614174000",
		version:        "1.0.0",
	}
}

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
    "name": "cull-pear-windows-amd64-installer.exe",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "size": 200
  }]
}`)
	}))
	defer server.Close()

	release, err := NewEndpointSource(server.Client(), nil).Latest(context.Background(), server.URL+"/github/releases", "zxm965/dn-wails")
	if err != nil {
		t.Fatalf("load GitHub release: %v", err)
	}
	if release.Version != "1.4.0" || release.Name != "v1.4.0" || release.Notes != "Release notes" {
		t.Fatalf("unexpected release metadata: %+v", release)
	}
	if len(release.Assets) != 1 || release.Assets[0].DownloadURL != server.URL+"/github/releases/download?filename=cull-pear-windows-amd64-installer.exe&version=v1.4.0" {
		t.Fatalf("unexpected release assets: %+v", release.Assets)
	}
}

func TestEndpointSourceDoesNotUseGitHubReleaseAssetDownloadURL(t *testing.T) {
	t.Parallel()

	data := []byte(`{
  "tag_name": "v1.4.0",
  "html_url": "https://github.com/zxm965/dn-wails/releases/tag/v1.4.0",
  "draft": false,
  "prerelease": false,
  "assets": [{
    "name": "cull-pear-windows-amd64-installer.exe",
	"browser_download_url": "https://download.example.com/attacker.exe",
    "digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "size": 200
  }]
}`)
	release, err := NewEndpointSource(nil, nil).releaseFromMetadata("https://nexus.example.com/github/releases", "zxm965/dn-wails", data)
	if err != nil {
		t.Fatalf("load release metadata: %v", err)
	}
	if got := release.Assets[0].DownloadURL; got != "https://nexus.example.com/github/releases/download?filename=cull-pear-windows-amd64-installer.exe&version=v1.4.0" {
		t.Fatalf("unexpected generated download URL: %s", got)
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
    "name": "cull-pear-windows-amd64-installer.exe",
    "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "size": 100
  }]
}`)
	}))
	defer server.Close()

	_, err := NewEndpointSource(server.Client(), nil).Latest(context.Background(), server.URL+"/github/releases", "zxm965/dn-wails")
	if err == nil || !strings.Contains(err.Error(), "repository mismatch") {
		t.Fatalf("expected release repository mismatch, got %v", err)
	}
}

func TestEndpointSourceRejectsReleaseTagWithoutVersionPrefix(t *testing.T) {
	t.Parallel()

	release := githubRelease{
		TagName: "1.4.0",
		HTMLURL: "https://github.com/zxm965/dn-wails/releases/tag/1.4.0",
		Assets: []githubReleaseAsset{{
			Name:   "cull-pear-windows-amd64-installer.exe",
			Digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			Size:   100,
		}},
	}

	if _, err := releaseFromGitHubRelease("https://nexus.example.com/github/releases", "zxm965/dn-wails", release); !errors.Is(err, coreupdate.ErrInvalidVersion) {
		t.Fatalf("expected invalid release version, got %v", err)
	}
}

func TestEndpointSourceRejectsMissingMetadata(t *testing.T) {
	t.Parallel()

	server := httptest.NewTLSServer(http.NotFoundHandler())
	defer server.Close()
	_, err := NewEndpointSource(server.Client(), nil).Latest(context.Background(), server.URL+"/github/releases", "zxm965/dn-wails")
	if !errors.Is(err, coreupdate.ErrNoRelease) {
		t.Fatalf("expected no release error, got %v", err)
	}
}

func TestEndpointSourceRejectsUnsafeGitHubReleaseAssets(t *testing.T) {
	t.Parallel()

	baseAsset := githubReleaseAsset{
		Name:   "cull-pear-windows-amd64-installer.exe",
		Digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:   100,
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
		"invalid download endpoint": func(release *githubRelease) {},
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
			endpoint := "https://nexus.example.com/github/releases"
			if name == "invalid download endpoint" {
				endpoint = "http://nexus.example.com/github/releases"
			}
			if _, err := releaseFromGitHubRelease(endpoint, "zxm965/dn-wails", release); err == nil {
				t.Fatal("expected unsafe release to be rejected")
			}
		})
	}
}

func TestEndpointSourceRejectsRouteSpecificUpdateEndpoint(t *testing.T) {
	t.Parallel()

	for _, endpoint := range []string{
		"https://nexus.example.com/github/releases/latest",
		"https://nexus.example.com/github/releases/download",
	} {
		endpoint := endpoint
		t.Run(endpoint, func(t *testing.T) {
			t.Parallel()
			_, err := NewEndpointSource(nil, nil).Latest(context.Background(), endpoint, "zxm965/dn-wails")
			if err == nil || !strings.Contains(err.Error(), "releases base URL") {
				t.Fatalf("expected route-specific endpoint to be rejected, got %v", err)
			}
		})
	}
}

func TestEndpointSourceDownloadsAndVerifiesAsset(t *testing.T) {
	t.Parallel()

	payload := []byte("verified update")
	digest := sha256.Sum256(payload)
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Header.Get("X-Install-ID") != "123e4567-e89b-42d3-a456-426614174000" {
			t.Fatalf("unexpected installation ID header %q", request.Header.Get("X-Install-ID"))
		}
		if request.Header.Get("X-App-Version") != "1.0.0" {
			t.Fatalf("unexpected application version header %q", request.Header.Get("X-App-Version"))
		}
		expectedUserAgent := fmt.Sprintf("cull-pear-updater/1.0.0 (%s; %s)", runtime.GOOS, runtime.GOARCH)
		if request.Header.Get("User-Agent") != expectedUserAgent {
			t.Fatalf("unexpected updater user agent %q", request.Header.Get("User-Agent"))
		}
		response.Header().Set("Content-Length", fmt.Sprintf("%d", len(payload)))
		response.Write(payload)
	}))
	defer server.Close()

	source := NewEndpointSource(server.Client(), validClientIdentity())
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
	err := NewEndpointSource(server.Client(), validClientIdentity()).Download(context.Background(), coreupdate.Asset{
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

func TestEndpointSourceRejectsDownloadWithoutInitializedInstallationIdentity(t *testing.T) {
	t.Parallel()

	requestCount := 0
	server := httptest.NewTLSServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		requestCount++
	}))
	defer server.Close()

	err := NewEndpointSource(server.Client(), clientIdentityStub{
		version: "1.0.0",
		err:     errors.New("identity unavailable"),
	}).Download(context.Background(), coreupdate.Asset{
		Name:        "update.zip",
		DownloadURL: server.URL,
		Digest:      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Size:        1,
	}, filepath.Join(t.TempDir(), "update.zip"))
	if err == nil || !strings.Contains(err.Error(), "identity unavailable") {
		t.Fatalf("expected installation identity error, got %v", err)
	}
	if requestCount != 0 {
		t.Fatalf("expected no upstream request, got %d", requestCount)
	}
}
