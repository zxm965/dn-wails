package appconfig

import (
	"bufio"
	"bytes"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	displayNameKey       = "APP_DISPLAY_NAME"
	maxDisplayNameLength = 40
)

type Config struct {
	DisplayName string `json:"displayName"`
}

func Parse(data []byte) (Config, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	displayName := ""
	foundDisplayName := false

	for lineNumber := 1; scanner.Scan(); lineNumber++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, rawValue, found := strings.Cut(line, "=")
		if !found {
			return Config{}, fmt.Errorf("parse application config line %d: expected KEY=VALUE", lineNumber)
		}
		key = strings.TrimSpace(key)
		if key != displayNameKey {
			continue
		}
		if foundDisplayName {
			return Config{}, fmt.Errorf("parse application config line %d: duplicate %s", lineNumber, displayNameKey)
		}

		value, err := parseValue(rawValue)
		if err != nil {
			return Config{}, fmt.Errorf("parse application config line %d: %w", lineNumber, err)
		}
		displayName = value
		foundDisplayName = true
	}
	if err := scanner.Err(); err != nil {
		return Config{}, fmt.Errorf("read application config: %w", err)
	}

	if !foundDisplayName {
		return Config{}, fmt.Errorf("validate application config: %s is required", displayNameKey)
	}
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return Config{}, fmt.Errorf("validate application config: %s cannot be empty", displayNameKey)
	}
	if utf8.RuneCountInString(displayName) > maxDisplayNameLength {
		return Config{}, fmt.Errorf("validate application config: %s exceeds %d characters", displayNameKey, maxDisplayNameLength)
	}
	for _, character := range displayName {
		if unicode.IsControl(character) || character == '\u2028' || character == '\u2029' {
			return Config{}, fmt.Errorf("validate application config: %s contains a control character", displayNameKey)
		}
	}

	return Config{DisplayName: displayName}, nil
}

func parseValue(rawValue string) (string, error) {
	value := strings.TrimSpace(rawValue)
	if value == "" {
		return "", nil
	}

	quote := value[0]
	if quote != '\'' && quote != '"' {
		return value, nil
	}
	if len(value) < 2 || value[len(value)-1] != quote {
		return "", fmt.Errorf("unterminated quoted value")
	}

	return value[1 : len(value)-1], nil
}
