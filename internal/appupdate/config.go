package appupdate

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const (
	updateBaseURLKey       = "APP_UPDATE_BASE_URL"
	maximumUpdateURLLength = 2048
)

var ErrUpdateBaseURLNotConfigured = errors.New("APP_UPDATE_BASE_URL is not configured in the process environment or embedded .env.local")

func ResolveUpdateBaseURL(configData []byte) (string, error) {
	if value := strings.TrimSpace(os.Getenv(updateBaseURLKey)); value != "" {
		return NormalizeUpdateBaseURL(value)
	}

	value, err := readUpdateBaseURL(configData)
	if err != nil {
		return "", err
	}
	if value == "" {
		return "", ErrUpdateBaseURLNotConfigured
	}
	return NormalizeUpdateBaseURL(value)
}

func NormalizeUpdateBaseURL(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", ErrUpdateBaseURLNotConfigured
	}
	if len(value) > maximumUpdateURLLength {
		return "", fmt.Errorf("validate APP_UPDATE_BASE_URL: exceeds %d bytes", maximumUpdateURLLength)
	}

	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.Hostname() == "" || parsed.Opaque != "" {
		return "", fmt.Errorf("validate APP_UPDATE_BASE_URL: must be an absolute HTTPS URL")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", fmt.Errorf("validate APP_UPDATE_BASE_URL: credentials, query parameters and fragments are not allowed")
	}

	parsed.Path = strings.TrimRight(parsed.Path, "/")
	parsed.RawPath = ""
	return parsed.String(), nil
}

func readUpdateBaseURL(data []byte) (string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	foundUpdateBaseURL := false
	updateBaseURL := ""
	for lineNumber := 1; scanner.Scan(); lineNumber++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, rawValue, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(key) != updateBaseURLKey {
			continue
		}
		if foundUpdateBaseURL {
			return "", fmt.Errorf("parse dn-wails/.env.local line %d: duplicate %s", lineNumber, updateBaseURLKey)
		}
		foundUpdateBaseURL = true
		value := strings.TrimSpace(rawValue)
		if len(value) >= 2 && ((value[0] == '\'' && value[len(value)-1] == '\'') || (value[0] == '"' && value[len(value)-1] == '"')) {
			value = value[1 : len(value)-1]
		}
		updateBaseURL = strings.TrimSpace(value)
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read application update configuration: %w", err)
	}
	return updateBaseURL, nil
}
