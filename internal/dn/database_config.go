package dn

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os"
	"strings"
)

const databaseURLKey = "DATABASE_URL"

var ErrDatabaseURLNotConfigured = errors.New("DATABASE_URL is not configured in the process environment or embedded .env.local")

func ResolveDatabaseURL(configData []byte) (string, error) {
	if value := strings.TrimSpace(os.Getenv(databaseURLKey)); value != "" {
		return value, nil
	}

	value, err := readDatabaseURL(configData)
	if err != nil {
		return "", err
	}
	if value != "" {
		return value, nil
	}

	return "", ErrDatabaseURLNotConfigured
}

func readDatabaseURL(data []byte) (string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	foundDatabaseURL := false
	databaseURL := ""
	for lineNumber := 1; scanner.Scan(); lineNumber++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, rawValue, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(key) != databaseURLKey {
			continue
		}
		if foundDatabaseURL {
			return "", fmt.Errorf("parse cull-pear/.env.local line %d: duplicate %s", lineNumber, databaseURLKey)
		}
		foundDatabaseURL = true
		value := strings.TrimSpace(rawValue)
		if len(value) >= 2 && ((value[0] == '\'' && value[len(value)-1] == '\'') || (value[0] == '"' && value[len(value)-1] == '"')) {
			value = value[1 : len(value)-1]
		}
		databaseURL = strings.TrimSpace(value)
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read cull-pear database configuration: %w", err)
	}
	return databaseURL, nil
}
