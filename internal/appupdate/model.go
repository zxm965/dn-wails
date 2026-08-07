package appupdate

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotConfigured     = errors.New("application updates are not configured")
	ErrNoRelease         = errors.New("no published release is available")
	ErrInvalidVersion    = errors.New("invalid application version")
	ErrAssetUnavailable  = errors.New("update asset is unavailable for this platform")
	ErrDigestUnavailable = errors.New("update asset does not provide a SHA-256 digest")
	ErrNoUpdate          = errors.New("no application update is available")
	ErrVersionChanged    = errors.New("the available application update has changed")
	ErrInstallInProgress = errors.New("an application update is already being installed")
)

type Info struct {
	CurrentVersion string `json:"currentVersion"`
	UpdateBaseURL  string `json:"updateBaseUrl"`
	Platform       string `json:"platform"`
	Arch           string `json:"arch"`
	Configured     bool   `json:"configured"`
	CanInstall     bool   `json:"canInstall"`
}

type Status struct {
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseName     string `json:"releaseName"`
	ReleaseNotes    string `json:"releaseNotes"`
	ReleaseURL      string `json:"releaseUrl"`
	PublishedAt     string `json:"publishedAt"`
}

type Asset struct {
	Name        string
	DownloadURL string
	Digest      string
	Size        int64
}

type Release struct {
	Version     string
	Name        string
	Notes       string
	URL         string
	PublishedAt time.Time
	Assets      []Asset
}

type ReleaseSource interface {
	Latest(ctx context.Context) (Release, error)
	Download(ctx context.Context, asset Asset, destination string) error
}

type Installer interface {
	Supported() bool
	Install(ctx context.Context, archivePath string) error
}
