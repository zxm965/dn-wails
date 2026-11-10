package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	coreupdate "cull-pear/internal/appupdate"
)

var contentRangePattern = regexp.MustCompile(`^bytes ([0-9]+)-([0-9]+)/([0-9]+)$`)

func (s *EndpointSource) DownloadWithProgress(ctx context.Context, asset coreupdate.Asset, destination string, onProgress coreupdate.ProgressCallback) error {
	if !s.downloadMu.TryLock() {
		return coreupdate.ErrInstallInProgress
	}
	defer s.downloadMu.Unlock()
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
	request.Header.Set("Accept-Encoding", "identity")
	if err := setDownloadIdentityHeaders(request, s.identity); err != nil {
		return fmt.Errorf("prepare update download request identity: %w", err)
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	cachePath, err := s.downloadCachePath(asset)
	if err != nil {
		return err
	}
	file, err := os.OpenFile(cachePath, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return fmt.Errorf("open update download cache: %w", err)
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return fmt.Errorf("inspect update download cache: %w", err)
	}
	if !info.Mode().IsRegular() {
		return errors.New("update download cache is not a regular file")
	}
	offset := info.Size()
	hash := sha256.New()
	reset := func() error {
		if err := file.Truncate(0); err != nil {
			return fmt.Errorf("reset update download cache: %w", err)
		}
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			return fmt.Errorf("rewind update download cache: %w", err)
		}
		offset = 0
		hash.Reset()
		return nil
	}
	if offset > asset.Size {
		if err := reset(); err != nil {
			return err
		}
	}
	if _, err := io.Copy(hash, &downloadContextReader{ctx: ctx, reader: file}); err != nil {
		return fmt.Errorf("read update download cache: %w", err)
	}
	if offset == asset.Size && !strings.EqualFold(hex.EncodeToString(hash.Sum(nil)), expectedDigest) {
		if err := reset(); err != nil {
			return err
		}
	}

	if offset < asset.Size {
		if offset > 0 {
			request.Header.Set("Range", fmt.Sprintf("bytes=%d-", offset))
		}
		response, err := s.downloadClient.Do(request)
		if err != nil {
			return fmt.Errorf("download update asset: %w", err)
		}
		// A stale or rejected range gets one fresh request, never an endless retry.
		if response.StatusCode == http.StatusRequestedRangeNotSatisfiable && offset > 0 {
			response.Body.Close()
			if err := reset(); err != nil {
				return err
			}
			request.Header.Del("Range")
			response, err = s.downloadClient.Do(request)
			if err != nil {
				return fmt.Errorf("restart update download: %w", err)
			}
		}
		defer response.Body.Close()
		if err := validateDownloadResponse(response, offset, asset.Size); err != nil {
			return err
		}
		// A server may ignore Range (or replace the resource) and send a full body.
		if response.StatusCode == http.StatusOK && offset > 0 {
			if err := reset(); err != nil {
				return err
			}
		}
		reportDownloadProgress(onProgress, offset, asset.Size)
		reader := &downloadContextReader{ctx: ctx, reader: io.LimitReader(response.Body, asset.Size-offset+1)}
		writer := &downloadProgressWriter{writer: io.MultiWriter(file, hash), written: offset, total: asset.Size, callback: onProgress}
		written, copyErr := io.Copy(writer, reader)
		offset += written
		if offset > asset.Size {
			return errors.Join(errors.New("download update asset: response exceeds declared size"), reset())
		}
		if copyErr != nil {
			return fmt.Errorf("save update asset: %w", copyErr)
		}
		if offset != asset.Size {
			return fmt.Errorf("save update asset: expected %d bytes, received %d", asset.Size, offset)
		}
	}
	if !strings.EqualFold(hex.EncodeToString(hash.Sum(nil)), expectedDigest) {
		return errors.Join(errors.New("verify update asset: SHA-256 digest mismatch"), reset())
	}
	if err := file.Sync(); err != nil {
		return fmt.Errorf("flush update download cache: %w", err)
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return fmt.Errorf("rewind verified update: %w", err)
	}
	if err := saveVerifiedDownload(ctx, file, destination); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close update download cache: %w", err)
	}
	if err := os.Remove(cachePath); err != nil {
		return fmt.Errorf("remove completed update download cache: %w", err)
	}
	reportDownloadProgress(onProgress, asset.Size, asset.Size)
	return nil
}

func (s *EndpointSource) downloadCachePath(asset coreupdate.Asset) (string, error) {
	directory := s.cacheDirectory
	if directory == "" {
		root, err := os.UserCacheDir()
		if err != nil {
			return "", fmt.Errorf("resolve update download cache: %w", err)
		}
		directory = filepath.Join(root, "cull-pear", "update-downloads")
	}
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return "", fmt.Errorf("create update download cache: %w", err)
	}
	// Bind a partial file to both the exact resource and its published contents.
	key := sha256.Sum256([]byte(fmt.Sprintf("%s\n%s\n%d", asset.DownloadURL, strings.ToLower(asset.Digest), asset.Size)))
	return filepath.Join(directory, hex.EncodeToString(key[:])+".part"), nil
}

func validateDownloadResponse(response *http.Response, offset, total int64) error {
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusPartialContent {
		return fmt.Errorf("download update asset: unexpected HTTP status %d", response.StatusCode)
	}
	if response.Request == nil || response.Request.URL == nil || response.Request.URL.Scheme != "https" {
		return errors.New("download update asset: missing HTTPS final URL")
	}
	if encoding := response.Header.Get("Content-Encoding"); response.Uncompressed || (encoding != "" && !strings.EqualFold(encoding, "identity")) {
		return errors.New("download update asset: unexpected content encoding")
	}
	expectedLength := total
	if response.StatusCode == http.StatusPartialContent {
		parts := contentRangePattern.FindStringSubmatch(response.Header.Get("Content-Range"))
		if len(parts) != 4 {
			return errors.New("download update asset: invalid Content-Range")
		}
		for index, expected := range []int64{offset, total - 1, total} {
			value, err := strconv.ParseInt(parts[index+1], 10, 64)
			if err != nil || value != expected {
				return errors.New("download update asset: mismatched Content-Range")
			}
		}
		expectedLength -= offset
	}
	if response.ContentLength >= 0 && response.ContentLength != expectedLength {
		return errors.New("download update asset: response length does not match declared size")
	}
	return nil
}

// Installation still receives a new temporary file, never an unverified cache.
func saveVerifiedDownload(ctx context.Context, source io.Reader, destination string) error {
	file, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("create verified update asset: %w", err)
	}
	complete := false
	defer func() {
		file.Close()
		if !complete {
			os.Remove(destination)
		}
	}()
	if _, err := io.Copy(file, &downloadContextReader{ctx: ctx, reader: source}); err != nil {
		return fmt.Errorf("save verified update asset: %w", err)
	}
	if err := file.Sync(); err != nil {
		return fmt.Errorf("flush verified update asset: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close verified update asset: %w", err)
	}
	complete = true
	return nil
}

type downloadContextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r *downloadContextReader) Read(buffer []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(buffer)
}

type downloadProgressWriter struct {
	writer         io.Writer
	written, total int64
	callback       coreupdate.ProgressCallback
}

func (w *downloadProgressWriter) Write(buffer []byte) (int, error) {
	count, err := w.writer.Write(buffer)
	w.written += int64(count)
	reportDownloadProgress(w.callback, w.written, w.total)
	return count, err
}

func reportDownloadProgress(callback coreupdate.ProgressCallback, written, total int64) {
	if callback != nil {
		callback(coreupdate.Progress{Phase: "downloading", DownloadedBytes: written, TotalBytes: total, Percent: int(min(written*100/total, 100))})
	}
}
