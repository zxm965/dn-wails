package appupdate

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

const testDigest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

type sourceStub struct {
	release       Release
	latestErr     error
	downloadErr   error
	downloaded    bool
	downloadValue string
}

func (s *sourceStub) Latest(context.Context, string) (Release, error) {
	return s.release, s.latestErr
}

func (s *sourceStub) Download(_ context.Context, _ Asset, destination string) error {
	s.downloaded = true
	if s.downloadErr != nil {
		return s.downloadErr
	}
	return os.WriteFile(destination, []byte(s.downloadValue), 0o600)
}

type installerStub struct {
	supported bool
	installed bool
	content   string
}

func (s *installerStub) Supported() bool {
	return s.supported
}

func (s *installerStub) Install(_ context.Context, archivePath string) error {
	data, err := os.ReadFile(archivePath)
	if err != nil {
		return err
	}
	s.installed = true
	s.content = string(data)
	return nil
}

func TestServiceChecksLatestRelease(t *testing.T) {
	t.Parallel()

	publishedAt := time.Date(2026, time.July, 31, 10, 30, 0, 0, time.FixedZone("CST", 8*60*60))
	source := &sourceStub{release: Release{
		Version:     "v1.3.0",
		Name:        "Release 1.3.0",
		Notes:       " New release notes. ",
		URL:         "https://gitee.com/zxm965/dn-wails/releases/tag/v1.3.0",
		PublishedAt: publishedAt,
	}}
	service := NewService(Config{
		AppName:    "dn-wails",
		Version:    "1.2.3",
		Repository: "zxm965/dn-wails",
		Platform:   "windows",
		Arch:       "amd64",
	}, source, &installerStub{supported: true})

	status, err := service.Check(context.Background())
	if err != nil {
		t.Fatalf("check update: %v", err)
	}
	if !status.UpdateAvailable || status.LatestVersion != "1.3.0" {
		t.Fatalf("unexpected update status: %+v", status)
	}
	if status.ReleaseNotes != "New release notes." {
		t.Fatalf("expected trimmed release notes, got %q", status.ReleaseNotes)
	}
	if status.PublishedAt != "2026-07-31T02:30:00Z" {
		t.Fatalf("unexpected published time %q", status.PublishedAt)
	}
}

func TestServiceTreatsSameOrOlderReleaseAsCurrent(t *testing.T) {
	t.Parallel()

	for _, latest := range []string{"1.2.3", "1.1.9"} {
		t.Run(latest, func(t *testing.T) {
			t.Parallel()
			service := NewService(Config{
				AppName:    "dn-wails",
				Version:    "1.2.3",
				Repository: "zxm965/dn-wails",
				Platform:   "darwin",
				Arch:       "arm64",
			}, &sourceStub{release: Release{Version: latest}}, &installerStub{supported: true})

			status, err := service.Check(context.Background())
			if err != nil {
				t.Fatalf("check update: %v", err)
			}
			if status.UpdateAvailable {
				t.Fatalf("expected %s not to update 1.2.3", latest)
			}
		})
	}
}

func TestServiceDownloadsMatchingAssetBeforeInstallation(t *testing.T) {
	t.Parallel()

	source := &sourceStub{
		release: Release{
			Version: "1.4.0",
			Assets: []Asset{{
				Name:        "dn-wails-windows-amd64-installer.exe",
				DownloadURL: "https://example.com/update.exe",
				Digest:      testDigest,
				Size:        7,
			}},
		},
		downloadValue: "payload",
	}
	installer := &installerStub{supported: true}
	service := NewService(Config{
		AppName:    "dn-wails",
		Version:    "1.3.0",
		Repository: "zxm965/dn-wails",
		Platform:   "windows",
		Arch:       "amd64",
	}, source, installer)

	if err := service.Install(context.Background(), "v1.4.0"); err != nil {
		t.Fatalf("install update: %v", err)
	}
	if !source.downloaded || !installer.installed || installer.content != "payload" {
		t.Fatalf("expected downloaded payload to be installed: source=%t installer=%t content=%q", source.downloaded, installer.installed, installer.content)
	}
}

func TestServiceRejectsChangedVersionAndMissingDigest(t *testing.T) {
	t.Parallel()

	source := &sourceStub{release: Release{
		Version: "1.4.0",
		Assets:  []Asset{{Name: "dn-wails-darwin-universal.dmg"}},
	}}
	service := NewService(Config{
		AppName:    "dn-wails",
		Version:    "1.3.0",
		Repository: "zxm965/dn-wails",
		Platform:   "darwin",
		Arch:       "arm64",
	}, source, &installerStub{supported: true})

	if err := service.Install(context.Background(), "1.3.9"); !errors.Is(err, ErrVersionChanged) {
		t.Fatalf("expected changed version error, got %v", err)
	}
	if err := service.Install(context.Background(), "1.4.0"); !errors.Is(err, ErrDigestUnavailable) {
		t.Fatalf("expected digest error, got %v", err)
	}
	if source.downloaded {
		t.Fatal("expected invalid asset not to be downloaded")
	}
}

func TestServiceDisablesDevelopmentAndUnsupportedBuilds(t *testing.T) {
	t.Parallel()

	development := NewService(Config{
		AppName:    "dn-wails",
		Version:    "1.2.3-dev",
		Repository: "zxm965/dn-wails",
		Platform:   "darwin",
		Arch:       "arm64",
	}, &sourceStub{}, &installerStub{supported: true})
	if development.Info().Configured {
		t.Fatal("expected development version not to enable updates")
	}

	unsupported := NewService(Config{
		AppName:    "dn-wails",
		Version:    "1.0.0",
		Repository: "zxm965/dn-wails",
		Platform:   "linux",
		Arch:       "amd64",
	}, &sourceStub{}, &installerStub{supported: false})
	info := unsupported.Info()
	if !info.Configured || info.CanInstall {
		t.Fatalf("unexpected unsupported platform info: %+v", info)
	}
}

func TestCompareVersions(t *testing.T) {
	t.Parallel()

	tests := []struct {
		current string
		latest  string
		want    int
	}{
		{current: "1.2.3", latest: "1.2.4", want: -1},
		{current: "1.9.9", latest: "2.0.0", want: -1},
		{current: "v2.0.0", latest: "2.0.0", want: 0},
		{current: "3.0.0", latest: "2.9.9", want: 1},
	}
	for _, test := range tests {
		comparison, err := compareVersions(test.current, test.latest)
		if err != nil {
			t.Fatalf("compare %s and %s: %v", test.current, test.latest, err)
		}
		if comparison != test.want {
			t.Fatalf("compare %s and %s: expected %d, got %d", test.current, test.latest, test.want, comparison)
		}
	}

	for _, invalid := range []string{"", "1.0", "1.0.0-beta", "01.0.0", strings.Repeat("9", 32) + ".0.0"} {
		if _, err := compareVersions(invalid, "1.0.0"); !errors.Is(err, ErrInvalidVersion) {
			t.Fatalf("expected %q to be invalid, got %v", invalid, err)
		}
	}
}
