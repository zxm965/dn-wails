package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"runtime"
	"strings"
	"time"

	coreupdate "dn-wails/internal/appupdate"
)

const (
	maxMetadataBody   = 2 * 1024 * 1024
	maxReleaseAssets  = 16
	maxAssetSize      = int64(1024 * 1024 * 1024)
	githubReleaseHost = "github.com"
	latestRoute       = "latest"
	downloadRoute     = "download"
)

var (
	releaseVersionPattern = regexp.MustCompile(`^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`)
	installationIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	repositoryPartPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)
	assetNamePattern      = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)
)

// EndpointSource loads GitHub Release metadata from a configured HTTPS endpoint
// and downloads assets through the corresponding proxy download route.
//
// The configured endpoint is the common releases base URL (for example,
// https://nexus.i96.me/github/releases). The latest and download routes are
// appended by the client according to their distinct responsibilities.
type EndpointSource struct {
	client   *http.Client
	identity ClientIdentity
}

type ClientIdentity interface {
	InstallationID() (string, error)
	CurrentVersion() string
}

type githubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	Body        string               `json:"body"`
	HTMLURL     string               `json:"html_url"`
	Draft       bool                 `json:"draft"`
	Prerelease  bool                 `json:"prerelease"`
	PublishedAt string               `json:"published_at"`
	Assets      []githubReleaseAsset `json:"assets"`
}

type githubReleaseAsset struct {
	Name   string `json:"name"`
	Digest string `json:"digest"`
	Size   int64  `json:"size"`
}

func NewEndpointSource(client *http.Client, identity ClientIdentity) *EndpointSource {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &EndpointSource{client: client, identity: identity}
}

func (s *EndpointSource) Latest(ctx context.Context, updateEndpoint string, repository string) (coreupdate.Release, error) {
	data, err := s.loadMetadata(ctx, updateEndpoint)
	if err != nil {
		return coreupdate.Release{}, err
	}
	return s.releaseFromMetadata(updateEndpoint, repository, data)
}

func (s *EndpointSource) loadMetadata(ctx context.Context, rawURL string) ([]byte, error) {
	updateEndpoint, err := buildReleaseEndpoint(rawURL, latestRoute)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, updateEndpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create application update metadata request: %w", err)
	}
	setUpdateHeaders(request, "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("request application update metadata: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("request application update metadata: %w", coreupdate.ErrNoRelease)
	}
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request application update metadata: unexpected HTTP status %d", response.StatusCode)
	}
	if response.Request == nil || response.Request.URL == nil {
		return nil, fmt.Errorf("request application update metadata: missing final URL")
	}
	if response.Request.URL.Scheme != "https" {
		return nil, fmt.Errorf("request application update metadata: redirect downgraded HTTPS")
	}

	data, err := io.ReadAll(io.LimitReader(response.Body, maxMetadataBody+1))
	if err != nil {
		return nil, fmt.Errorf("read application update metadata: %w", err)
	}
	if len(data) > maxMetadataBody {
		return nil, fmt.Errorf("read application update metadata: response exceeds %d bytes", maxMetadataBody)
	}
	return data, nil
}

func (s *EndpointSource) releaseFromMetadata(updateEndpoint string, repository string, data []byte) (coreupdate.Release, error) {
	var release githubRelease
	if err := json.Unmarshal(data, &release); err != nil {
		return coreupdate.Release{}, fmt.Errorf("decode application update metadata: %w", err)
	}
	return releaseFromGitHubRelease(updateEndpoint, repository, release)
}

func releaseFromGitHubRelease(updateEndpoint string, repository string, release githubRelease) (coreupdate.Release, error) {
	expectedRepository, err := normalizeRepository(repository)
	if err != nil {
		return coreupdate.Release{}, err
	}
	if release.Draft || release.Prerelease {
		return coreupdate.Release{}, coreupdate.ErrNoRelease
	}
	releaseTag := strings.TrimSpace(release.TagName)
	if !strings.HasPrefix(releaseTag, "v") {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: %w", coreupdate.ErrInvalidVersion)
	}
	version := strings.TrimPrefix(releaseTag, "v")
	if len(version) > 64 || !releaseVersionPattern.MatchString(version) {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: %w", coreupdate.ErrInvalidVersion)
	}
	releaseURL, err := parseHTTPSURL(release.HTMLURL, "release")
	if err != nil {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: %w", err)
	}
	if !matchesGitHubRepository(releaseURL, expectedRepository) {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: repository mismatch")
	}
	downloadEndpoint, err := buildReleaseEndpoint(updateEndpoint, downloadRoute)
	if err != nil {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: %w", err)
	}
	if len(release.Assets) == 0 || len(release.Assets) > maxReleaseAssets {
		return coreupdate.Release{}, fmt.Errorf("validate application update release: invalid asset count %d", len(release.Assets))
	}

	publishedAt := time.Time{}
	if value := strings.TrimSpace(release.PublishedAt); value != "" {
		publishedAt, _ = time.Parse(time.RFC3339, value)
		if publishedAt.IsZero() {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: invalid published time")
		}
	}

	assets := make([]coreupdate.Asset, 0, len(release.Assets))
	seenAssets := make(map[string]struct{}, len(release.Assets))
	for _, asset := range release.Assets {
		assetName := strings.TrimSpace(asset.Name)
		if !validAssetName(assetName) {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: invalid asset name %q", asset.Name)
		}
		if _, exists := seenAssets[assetName]; exists {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: duplicate asset %q", assetName)
		}
		seenAssets[assetName] = struct{}{}
		if asset.Size <= 0 || asset.Size > maxAssetSize {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: invalid asset size %d", asset.Size)
		}
		if _, err := parseSHA256Digest(asset.Digest); err != nil {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: asset %q: %w", assetName, err)
		}
		assetURL, err := buildAssetDownloadURL(downloadEndpoint, releaseTag, assetName)
		if err != nil {
			return coreupdate.Release{}, fmt.Errorf("validate application update release: asset %q: %w", assetName, err)
		}
		assets = append(assets, coreupdate.Asset{
			Name:        assetName,
			DownloadURL: assetURL.String(),
			Digest:      strings.TrimSpace(asset.Digest),
			Size:        asset.Size,
		})
	}

	return coreupdate.Release{
		Version:     version,
		Name:        strings.TrimSpace(release.Name),
		Notes:       strings.TrimSpace(release.Body),
		URL:         releaseURL.String(),
		PublishedAt: publishedAt,
		Assets:      assets,
	}, nil
}

func (s *EndpointSource) Download(ctx context.Context, asset coreupdate.Asset, destination string) error {
	downloadURL, err := parseHTTPSURL(asset.DownloadURL, "download")
	if err != nil {
		return fmt.Errorf("download update asset: %w", err)
	}
	if asset.Size <= 0 || asset.Size > maxAssetSize {
		return fmt.Errorf("download update asset: invalid asset size %d", asset.Size)
	}
	expectedDigest, err := parseSHA256Digest(asset.Digest)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL.String(), nil)
	if err != nil {
		return fmt.Errorf("create update download request: %w", err)
	}
	setUpdateHeaders(request, "application/octet-stream")
	if err := setDownloadIdentityHeaders(request, s.identity); err != nil {
		return fmt.Errorf("prepare update download request identity: %w", err)
	}

	response, err := s.client.Do(request)
	if err != nil {
		return fmt.Errorf("download update asset: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("download update asset: unexpected HTTP status %d", response.StatusCode)
	}
	if response.Request == nil || response.Request.URL == nil {
		return fmt.Errorf("download update asset: missing final URL")
	}
	if response.Request.URL.Scheme != "https" {
		return fmt.Errorf("download update asset: redirect downgraded HTTPS")
	}
	if response.ContentLength > asset.Size || response.ContentLength > maxAssetSize {
		return fmt.Errorf("download update asset: response exceeds declared size")
	}

	file, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("create update asset: %w", err)
	}
	removeFile := true
	defer func() {
		file.Close()
		if removeFile {
			os.Remove(destination)
		}
	}()

	hash := sha256.New()
	written, copyErr := io.Copy(io.MultiWriter(file, hash), io.LimitReader(response.Body, maxAssetSize+1))
	if copyErr != nil {
		return fmt.Errorf("save update asset: %w", copyErr)
	}
	if written != asset.Size {
		return fmt.Errorf("save update asset: expected %d bytes, received %d", asset.Size, written)
	}
	if err := file.Sync(); err != nil {
		return fmt.Errorf("flush update asset: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close update asset: %w", err)
	}
	if !strings.EqualFold(hex.EncodeToString(hash.Sum(nil)), expectedDigest) {
		return errors.New("verify update asset: SHA-256 digest mismatch")
	}

	removeFile = false
	return nil
}

func setUpdateHeaders(request *http.Request, accept string) {
	request.Header.Set("Accept", accept)
	request.Header.Set("User-Agent", "dn-wails-updater")
}

func setDownloadIdentityHeaders(request *http.Request, identity ClientIdentity) error {
	if identity == nil {
		return errors.New("installation identity is unavailable")
	}

	installationID, err := identity.InstallationID()
	if err != nil {
		return err
	}
	installationID = strings.TrimSpace(installationID)
	if !installationIDPattern.MatchString(installationID) {
		return errors.New("installation identity is invalid")
	}

	appVersion := strings.TrimSpace(identity.CurrentVersion())
	if len(appVersion) > 64 || !releaseVersionPattern.MatchString(appVersion) {
		return errors.New("current application version is invalid")
	}

	request.Header.Set("X-Install-ID", installationID)
	request.Header.Set("X-App-Version", appVersion)
	request.Header.Set(
		"User-Agent",
		fmt.Sprintf("dn-wails-updater/%s (%s; %s)", appVersion, runtime.GOOS, runtime.GOARCH),
	)
	return nil
}

func parseHTTPSURL(rawURL string, label string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
		return nil, fmt.Errorf("invalid HTTPS %s URL", label)
	}
	return parsed, nil
}

func buildReleaseEndpoint(rawURL string, route string) (*url.URL, error) {
	endpoint, err := parseHTTPSURL(rawURL, "update endpoint")
	if err != nil {
		return nil, err
	}

	pathValue := strings.TrimRight(endpoint.Path, "/")
	if strings.HasSuffix(pathValue, "/"+latestRoute) || strings.HasSuffix(pathValue, "/"+downloadRoute) {
		return nil, fmt.Errorf("invalid update endpoint: expected a releases base URL")
	}
	endpoint.Path = strings.TrimRight(pathValue, "/") + "/" + route
	endpoint.RawPath = ""
	endpoint.RawQuery = ""
	endpoint.Fragment = ""
	return endpoint, nil
}

func buildAssetDownloadURL(downloadEndpoint *url.URL, version string, filename string) (*url.URL, error) {
	if downloadEndpoint == nil {
		return nil, errors.New("invalid download endpoint")
	}
	version = strings.TrimSpace(version)
	filename = strings.TrimSpace(filename)
	if version == "" || filename == "" {
		return nil, errors.New("version and filename are required")
	}

	assetURL := *downloadEndpoint
	query := assetURL.Query()
	query.Set("filename", filename)
	query.Set("version", version)
	assetURL.RawQuery = query.Encode()
	return &assetURL, nil
}

func matchesGitHubRepository(value *url.URL, repository string) bool {
	return matchesRepositoryHost(value, githubReleaseHost, repository)
}

func matchesRepositoryHost(value *url.URL, host string, repository string) bool {
	if value == nil || !strings.EqualFold(value.Host, host) {
		return false
	}
	parts := strings.Split(strings.Trim(value.EscapedPath(), "/"), "/")
	if len(parts) < 2 {
		return false
	}
	return strings.EqualFold(parts[0]+"/"+parts[1], repository)
}

func normalizeRepository(repository string) (string, error) {
	parts := strings.Split(strings.TrimSpace(repository), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || strings.ContainsAny(repository, "?#\\") {
		return "", fmt.Errorf("configure application updates: invalid repository %q", repository)
	}
	name := strings.TrimSuffix(parts[1], ".git")
	if name == "" || !repositoryPartPattern.MatchString(parts[0]) || !repositoryPartPattern.MatchString(name) {
		return "", fmt.Errorf("configure application updates: invalid repository %q", repository)
	}
	return parts[0] + "/" + name, nil
}

func parseSHA256Digest(value string) (string, error) {
	digest, found := strings.CutPrefix(strings.TrimSpace(value), "sha256:")
	if !found || len(digest) != 64 {
		return "", coreupdate.ErrDigestUnavailable
	}
	if _, err := hex.DecodeString(digest); err != nil {
		return "", coreupdate.ErrDigestUnavailable
	}
	return digest, nil
}

func validAssetName(value string) bool {
	return value != "." && value != ".." && len(value) <= 255 && assetNamePattern.MatchString(value)
}
