package dn

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"dn-wails/internal/storage"
)

const databaseConnectionStorageKey = "dn-database-connection"

type databaseConnection struct {
	URL string `json:"url"`
}

func ResolveDatabaseURL(store storage.Store) (string, error) {
	if value := strings.TrimSpace(os.Getenv("DATABASE_URL")); value != "" {
		return value, nil
	}

	data, err := store.Load(databaseConnectionStorageKey)
	if err == nil {
		var connection databaseConnection
		if decodeErr := json.Unmarshal(data, &connection); decodeErr != nil {
			return "", fmt.Errorf("decode stored DN database connection: %w", decodeErr)
		}
		if value := strings.TrimSpace(connection.URL); value != "" {
			return value, nil
		}
	} else if !errors.Is(err, storage.ErrNotFound) {
		return "", fmt.Errorf("load stored DN database connection: %w", err)
	}

	for _, path := range databaseEnvironmentCandidates() {
		value, readErr := readDatabaseURL(path)
		if errors.Is(readErr, os.ErrNotExist) {
			continue
		}
		if readErr != nil {
			return "", readErr
		}
		if value == "" {
			continue
		}
		encoded, encodeErr := json.Marshal(databaseConnection{URL: value})
		if encodeErr != nil {
			return "", fmt.Errorf("encode DN database connection: %w", encodeErr)
		}
		if saveErr := store.Save(databaseConnectionStorageKey, encoded); saveErr != nil {
			return "", fmt.Errorf("persist DN database connection: %w", saveErr)
		}
		return value, nil
	}

	return "", fmt.Errorf("DATABASE_URL is not configured; set the environment variable or keep dn-next/.env beside this project")
}

func databaseEnvironmentCandidates() []string {
	seen := make(map[string]struct{})
	paths := make([]string, 0)
	add := func(path string) {
		path = filepath.Clean(path)
		if _, exists := seen[path]; exists {
			return
		}
		seen[path] = struct{}{}
		paths = append(paths, path)
	}
	addRoots := func(start string) {
		current := filepath.Clean(start)
		for range 6 {
			add(filepath.Join(current, ".env.local"))
			add(filepath.Join(current, ".env"))
			add(filepath.Join(current, "dn-next", ".env.local"))
			add(filepath.Join(current, "dn-next", ".env"))
			add(filepath.Join(filepath.Dir(current), "dn-next", ".env.local"))
			add(filepath.Join(filepath.Dir(current), "dn-next", ".env"))
			parent := filepath.Dir(current)
			if parent == current {
				break
			}
			current = parent
		}
	}
	if workingDirectory, err := os.Getwd(); err == nil {
		addRoots(workingDirectory)
	}
	if executable, err := os.Executable(); err == nil {
		addRoots(filepath.Dir(executable))
	}
	return paths
}

func readDatabaseURL(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, rawValue, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(key) != "DATABASE_URL" {
			continue
		}
		value := strings.TrimSpace(rawValue)
		if len(value) >= 2 && ((value[0] == '\'' && value[len(value)-1] == '\'') || (value[0] == '"' && value[len(value)-1] == '"')) {
			value = value[1 : len(value)-1]
		}
		return strings.TrimSpace(value), nil
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read database environment %q: %w", path, err)
	}
	return "", nil
}
