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
	"strings"
	"time"

	coreupdate "dn-wails/internal/appupdate"
)

const (
	githubAPIBaseURL = "https://api.github.com"
	githubAPIVersion = "2026-03-10"
	maxReleaseBody   = 2 * 1024 * 1024
	maxAssetSize     = int64(1024 * 1024 * 1024)
)

type GitHubSource struct {
	client     *http.Client
	apiBaseURL string
}

type githubRelease struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt time.Time     `json:"published_at"`
	Assets      []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Digest             string `json:"digest"`
	Size               int64  `json:"size"`
}

func NewGitHubSource(client *http.Client) *GitHubSource {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &GitHubSource{client: client, apiBaseURL: githubAPIBaseURL}
}

func (s *GitHubSource) Latest(ctx context.Context, repository string) (coreupdate.Release, error) {
	owner, name, err := parseRepository(repository)
	if err != nil {
		return coreupdate.Release{}, err
	}

	endpoint := fmt.Sprintf("%s/repos/%s/%s/releases/latest", strings.TrimRight(s.apiBaseURL, "/"), url.PathEscape(owner), url.PathEscape(name))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return coreupdate.Release{}, fmt.Errorf("create GitHub release request: %w", err)
	}
	setGitHubHeaders(request)

	response, err := s.client.Do(request)
	if err != nil {
		return coreupdate.Release{}, fmt.Errorf("request latest GitHub release: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound {
		return coreupdate.Release{}, coreupdate.ErrNoRelease
	}
	if response.StatusCode != http.StatusOK {
		return coreupdate.Release{}, fmt.Errorf("request latest GitHub release: unexpected HTTP status %d", response.StatusCode)
	}

	var payload githubRelease
	decoder := json.NewDecoder(io.LimitReader(response.Body, maxReleaseBody))
	if err := decoder.Decode(&payload); err != nil {
		return coreupdate.Release{}, fmt.Errorf("decode latest GitHub release: %w", err)
	}
	if strings.TrimSpace(payload.TagName) == "" {
		return coreupdate.Release{}, fmt.Errorf("decode latest GitHub release: %w", coreupdate.ErrInvalidVersion)
	}

	assets := make([]coreupdate.Asset, 0, len(payload.Assets))
	for _, asset := range payload.Assets {
		assets = append(assets, coreupdate.Asset{
			Name:        asset.Name,
			DownloadURL: asset.BrowserDownloadURL,
			Digest:      asset.Digest,
			Size:        asset.Size,
		})
	}
	return coreupdate.Release{
		Version:     payload.TagName,
		Name:        payload.Name,
		Notes:       payload.Body,
		URL:         payload.HTMLURL,
		PublishedAt: payload.PublishedAt,
		Assets:      assets,
	}, nil
}

func (s *GitHubSource) Download(ctx context.Context, asset coreupdate.Asset, destination string) error {
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
	request.Header.Set("Accept", "application/octet-stream")
	request.Header.Set("User-Agent", "dn-wails-updater")

	response, err := s.client.Do(request)
	if err != nil {
		return fmt.Errorf("download update asset: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("download update asset: unexpected HTTP status %d", response.StatusCode)
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

func setGitHubHeaders(request *http.Request) {
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("X-GitHub-Api-Version", githubAPIVersion)
	request.Header.Set("User-Agent", "dn-wails-updater")
}

func parseRepository(repository string) (string, string, error) {
	parts := strings.Split(strings.TrimSpace(repository), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || strings.ContainsAny(repository, "?#\\") {
		return "", "", fmt.Errorf("configure GitHub updates: invalid repository %q", repository)
	}
	name := strings.TrimSuffix(parts[1], ".git")
	if name == "" {
		return "", "", fmt.Errorf("configure GitHub updates: invalid repository %q", repository)
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
