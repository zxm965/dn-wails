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
	"strings"
	"time"

	coreupdate "dn-wails/internal/appupdate"
)

const (
	giteeAPIBaseURL   = "https://gitee.com/api/v5"
	giteeWebBaseURL   = "https://gitee.com"
	updateManifest    = "latest.json"
	manifestVersion   = 1
	maxManifestBody   = 2 * 1024 * 1024
	maxManifestAssets = 16
	maxAssetSize      = int64(1024 * 1024 * 1024)
)

var (
	releaseTagPattern     = regexp.MustCompile(`^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`)
	repositoryPartPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)
	assetNamePattern      = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)
)

type GiteeSource struct {
	client     *http.Client
	apiBaseURL string
	webBaseURL string
}

type giteeRelease struct {
	TagName string `json:"tag_name"`
}

type releaseManifest struct {
	SchemaVersion int                    `json:"schemaVersion"`
	Repository    string                 `json:"repository"`
	Version       string                 `json:"version"`
	Name          string                 `json:"name"`
	Notes         string                 `json:"notes"`
	ReleaseURL    string                 `json:"releaseUrl"`
	PublishedAt   string                 `json:"publishedAt"`
	Assets        []releaseManifestAsset `json:"assets"`
}

type releaseManifestAsset struct {
	Name   string `json:"name"`
	URL    string `json:"url"`
	Digest string `json:"digest"`
	Size   int64  `json:"size"`
}

func NewGiteeSource(client *http.Client) *GiteeSource {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &GiteeSource{
		client:     client,
		apiBaseURL: giteeAPIBaseURL,
		webBaseURL: giteeWebBaseURL,
	}
}

func (s *GiteeSource) Latest(ctx context.Context, repository string) (coreupdate.Release, error) {
	owner, name, err := parseRepository(repository)
	if err != nil {
		return coreupdate.Release{}, err
	}
	normalizedRepository := owner + "/" + name

	tag, err := s.resolveLatestTag(ctx, owner, name)
	if err != nil {
		return coreupdate.Release{}, err
	}
	manifest, err := s.loadManifest(ctx, owner, name, tag)
	if err != nil {
		return coreupdate.Release{}, err
	}
	return s.releaseFromManifest(normalizedRepository, owner, name, tag, manifest)
}

func (s *GiteeSource) resolveLatestTag(ctx context.Context, owner string, name string) (string, error) {
	baseURL, err := url.Parse(strings.TrimRight(s.apiBaseURL, "/"))
	if err != nil || baseURL.Scheme == "" || baseURL.Host == "" {
		return "", fmt.Errorf("configure Gitee updates: invalid API base URL")
	}
	endpoint := fmt.Sprintf("%s/repos/%s/%s/releases/latest", strings.TrimRight(s.apiBaseURL, "/"), owner, name)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("create latest Gitee release request: %w", err)
	}
	setGiteeHeaders(request, "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return "", fmt.Errorf("request latest Gitee release: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound {
		return "", coreupdate.ErrNoRelease
	}
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("request latest Gitee release: unexpected HTTP status %d", response.StatusCode)
	}
	if response.Request == nil || response.Request.URL == nil {
		return "", fmt.Errorf("request latest Gitee release: missing final URL")
	}
	finalURL := response.Request.URL
	if finalURL.Scheme != baseURL.Scheme || !strings.EqualFold(finalURL.Host, baseURL.Host) {
		return "", fmt.Errorf("request latest Gitee release: redirected outside configured Gitee API host")
	}

	data, err := io.ReadAll(io.LimitReader(response.Body, maxManifestBody+1))
	if err != nil {
		return "", fmt.Errorf("read latest Gitee release: %w", err)
	}
	if len(data) > maxManifestBody {
		return "", fmt.Errorf("read latest Gitee release: response exceeds %d bytes", maxManifestBody)
	}
	var release giteeRelease
	if err := json.Unmarshal(data, &release); err != nil {
		return "", fmt.Errorf("decode latest Gitee release: %w", err)
	}
	tag := strings.TrimSpace(release.TagName)
	if !releaseTagPattern.MatchString(tag) {
		return "", fmt.Errorf("request latest Gitee release: %w", coreupdate.ErrInvalidVersion)
	}
	return tag, nil
}

func (s *GiteeSource) loadManifest(ctx context.Context, owner string, name string, tag string) (releaseManifest, error) {
	endpoint := s.releaseAssetURL(owner, name, tag, updateManifest)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return releaseManifest{}, fmt.Errorf("create application update manifest request: %w", err)
	}
	setGiteeHeaders(request, "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return releaseManifest{}, fmt.Errorf("request application update manifest: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return releaseManifest{}, fmt.Errorf("request application update manifest: %w", coreupdate.ErrNoRelease)
	}
	if response.StatusCode != http.StatusOK {
		return releaseManifest{}, fmt.Errorf("request application update manifest: unexpected HTTP status %d", response.StatusCode)
	}
	if response.Request == nil || response.Request.URL == nil {
		return releaseManifest{}, fmt.Errorf("request application update manifest: missing final URL")
	}
	if strings.HasPrefix(s.webBaseURL, "https://") && response.Request.URL.Scheme != "https" {
		return releaseManifest{}, fmt.Errorf("request application update manifest: redirect downgraded HTTPS")
	}

	data, err := io.ReadAll(io.LimitReader(response.Body, maxManifestBody+1))
	if err != nil {
		return releaseManifest{}, fmt.Errorf("read application update manifest: %w", err)
	}
	if len(data) > maxManifestBody {
		return releaseManifest{}, fmt.Errorf("read application update manifest: response exceeds %d bytes", maxManifestBody)
	}
	var manifest releaseManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return releaseManifest{}, fmt.Errorf("decode application update manifest: %w", err)
	}
	return manifest, nil
}

func (s *GiteeSource) releaseFromManifest(repository string, owner string, name string, tag string, manifest releaseManifest) (coreupdate.Release, error) {
	if manifest.SchemaVersion != manifestVersion {
		return coreupdate.Release{}, fmt.Errorf("validate application update manifest: unsupported schema version %d", manifest.SchemaVersion)
	}
	if strings.TrimSpace(manifest.Repository) != repository {
		return coreupdate.Release{}, fmt.Errorf("validate application update manifest: repository mismatch")
	}
	if strings.TrimSpace(manifest.Version) != strings.TrimPrefix(tag, "v") {
		return coreupdate.Release{}, fmt.Errorf("validate application update manifest: version mismatch")
	}
	expectedReleaseURL := fmt.Sprintf("%s/%s/%s/releases/tag/%s", strings.TrimRight(s.webBaseURL, "/"), owner, name, tag)
	if strings.TrimSpace(manifest.ReleaseURL) != expectedReleaseURL {
		return coreupdate.Release{}, fmt.Errorf("validate application update manifest: release URL mismatch")
	}
	if len(manifest.Assets) == 0 || len(manifest.Assets) > maxManifestAssets {
		return coreupdate.Release{}, fmt.Errorf("validate application update manifest: invalid asset count %d", len(manifest.Assets))
	}

	publishedAt := time.Time{}
	if value := strings.TrimSpace(manifest.PublishedAt); value != "" {
		publishedAt, _ = time.Parse(time.RFC3339, value)
		if publishedAt.IsZero() {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: invalid published time")
		}
	}

	assets := make([]coreupdate.Asset, 0, len(manifest.Assets))
	seenAssets := make(map[string]struct{}, len(manifest.Assets))
	for _, asset := range manifest.Assets {
		assetName := strings.TrimSpace(asset.Name)
		if !validAssetName(assetName) {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: invalid asset name %q", asset.Name)
		}
		if _, exists := seenAssets[assetName]; exists {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: duplicate asset %q", assetName)
		}
		seenAssets[assetName] = struct{}{}
		if asset.Size <= 0 || asset.Size > maxAssetSize {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: invalid asset size %d", asset.Size)
		}
		if _, err := parseSHA256Digest(asset.Digest); err != nil {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: asset %q: %w", assetName, err)
		}
		expectedAssetURL := s.releaseAssetURL(owner, name, tag, assetName)
		if strings.TrimSpace(asset.URL) != expectedAssetURL {
			return coreupdate.Release{}, fmt.Errorf("validate application update manifest: asset URL mismatch for %q", assetName)
		}
		assets = append(assets, coreupdate.Asset{
			Name:        assetName,
			DownloadURL: expectedAssetURL,
			Digest:      strings.TrimSpace(asset.Digest),
			Size:        asset.Size,
		})
	}

	return coreupdate.Release{
		Version:     manifest.Version,
		Name:        strings.TrimSpace(manifest.Name),
		Notes:       strings.TrimSpace(manifest.Notes),
		URL:         expectedReleaseURL,
		PublishedAt: publishedAt,
		Assets:      assets,
	}, nil
}

func (s *GiteeSource) releaseAssetURL(owner string, name string, tag string, assetName string) string {
	return fmt.Sprintf("%s/%s/%s/releases/download/%s/%s", strings.TrimRight(s.webBaseURL, "/"), owner, name, tag, url.PathEscape(assetName))
}

func (s *GiteeSource) Download(ctx context.Context, asset coreupdate.Asset, destination string) error {
	downloadURL, err := url.Parse(strings.TrimSpace(asset.DownloadURL))
	if err != nil || downloadURL.Scheme != "https" || downloadURL.Host == "" {
		return fmt.Errorf("download update asset: invalid HTTPS URL")
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
	setGiteeHeaders(request, "application/octet-stream")

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

func setGiteeHeaders(request *http.Request, accept string) {
	request.Header.Set("Accept", accept)
	request.Header.Set("User-Agent", "dn-wails-updater")
}

func parseRepository(repository string) (string, string, error) {
	parts := strings.Split(strings.TrimSpace(repository), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || strings.ContainsAny(repository, "?#\\") {
		return "", "", fmt.Errorf("configure Gitee updates: invalid repository %q", repository)
	}
	name := strings.TrimSuffix(parts[1], ".git")
	if name == "" {
		return "", "", fmt.Errorf("configure Gitee updates: invalid repository %q", repository)
	}
	if !repositoryPartPattern.MatchString(parts[0]) || !repositoryPartPattern.MatchString(name) {
		return "", "", fmt.Errorf("configure Gitee updates: invalid repository %q", repository)
	}
	return parts[0], name, nil
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
