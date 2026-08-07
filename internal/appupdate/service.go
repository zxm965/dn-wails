package appupdate

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type Config struct {
	AppName       string
	Version       string
	UpdateBaseURL string
	Platform      string
	Arch          string
}

type Service struct {
	config    Config
	assetName string
	source    ReleaseSource
	installer Installer

	installMu  sync.Mutex
	installing bool
}

func NewService(config Config, source ReleaseSource, installer Installer) *Service {
	config.AppName = strings.TrimSpace(config.AppName)
	config.Version = normalizeVersion(config.Version)
	config.UpdateBaseURL = strings.TrimSpace(config.UpdateBaseURL)
	return &Service{
		config:    config,
		assetName: releaseAssetName(config.AppName, config.Platform, config.Arch),
		source:    source,
		installer: installer,
	}
}

func (s *Service) Info() Info {
	_, versionErr := parseVersion(s.config.Version)
	configured := s.config.UpdateBaseURL != "" && versionErr == nil && s.source != nil
	canInstall := configured && s.assetName != "" && s.installer != nil && s.installer.Supported()
	return Info{
		CurrentVersion: s.config.Version,
		UpdateBaseURL:  s.config.UpdateBaseURL,
		Platform:       s.config.Platform,
		Arch:           s.config.Arch,
		Configured:     configured,
		CanInstall:     canInstall,
	}
}

func (s *Service) Check(ctx context.Context) (Status, error) {
	info := s.Info()
	if !info.Configured {
		return Status{}, ErrNotConfigured
	}

	release, err := s.source.Latest(ctx)
	if err != nil {
		return Status{}, err
	}
	latestVersion := normalizeVersion(release.Version)
	comparison, err := compareVersions(s.config.Version, latestVersion)
	if err != nil {
		return Status{}, err
	}

	status := Status{
		CurrentVersion:  s.config.Version,
		LatestVersion:   latestVersion,
		UpdateAvailable: comparison < 0,
		ReleaseName:     strings.TrimSpace(release.Name),
		ReleaseNotes:    strings.TrimSpace(release.Notes),
		ReleaseURL:      strings.TrimSpace(release.URL),
	}
	if !release.PublishedAt.IsZero() {
		status.PublishedAt = release.PublishedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	return status, nil
}

func (s *Service) Install(ctx context.Context, expectedVersion string) error {
	s.installMu.Lock()
	if s.installing {
		s.installMu.Unlock()
		return ErrInstallInProgress
	}
	s.installing = true
	s.installMu.Unlock()
	defer func() {
		s.installMu.Lock()
		s.installing = false
		s.installMu.Unlock()
	}()

	info := s.Info()
	if !info.Configured {
		return ErrNotConfigured
	}
	if !info.CanInstall {
		return ErrAssetUnavailable
	}

	release, err := s.source.Latest(ctx)
	if err != nil {
		return err
	}
	latestVersion := normalizeVersion(release.Version)
	comparison, err := compareVersions(s.config.Version, latestVersion)
	if err != nil {
		return err
	}
	if comparison >= 0 {
		return ErrNoUpdate
	}
	if normalizeVersion(expectedVersion) != latestVersion {
		return ErrVersionChanged
	}

	asset, found := findAsset(release.Assets, s.assetName)
	if !found {
		return fmt.Errorf("%w: %s", ErrAssetUnavailable, s.assetName)
	}
	if !hasSHA256Digest(asset.Digest) {
		return fmt.Errorf("%w: %s", ErrDigestUnavailable, asset.Name)
	}

	tempDirectory, err := os.MkdirTemp("", s.config.AppName+"-update-*")
	if err != nil {
		return fmt.Errorf("create update directory: %w", err)
	}
	defer os.RemoveAll(tempDirectory)

	archivePath := filepath.Join(tempDirectory, filepath.Base(asset.Name))
	if err := s.source.Download(ctx, asset, archivePath); err != nil {
		return err
	}
	if err := s.installer.Install(ctx, archivePath); err != nil {
		return fmt.Errorf("prepare application update: %w", err)
	}
	return nil
}

func releaseAssetName(appName string, platform string, arch string) string {
	switch platform {
	case "darwin":
		if arch == "amd64" || arch == "arm64" {
			return appName + "-darwin-universal.zip"
		}
	case "windows":
		if arch == "amd64" {
			return appName + "-windows-amd64-installer.exe"
		}
	}
	return ""
}

func findAsset(assets []Asset, name string) (Asset, bool) {
	for _, asset := range assets {
		if asset.Name == name {
			return asset, true
		}
	}
	return Asset{}, false
}

func hasSHA256Digest(digest string) bool {
	digest = strings.TrimSpace(digest)
	if !strings.HasPrefix(digest, "sha256:") || len(digest) != len("sha256:")+64 {
		return false
	}
	for _, character := range digest[len("sha256:"):] {
		if (character < '0' || character > '9') && (character < 'a' || character > 'f') && (character < 'A' || character > 'F') {
			return false
		}
	}
	return true
}
