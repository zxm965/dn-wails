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
	authorNameKey        = "APP_AUTHOR_NAME"
	maxDisplayNameLength = 40
	maxAuthorNameLength  = 40
)

type Config struct {
	DisplayName string `json:"displayName"`
	AuthorName  string `json:"authorName"`
}

func Parse(data []byte) (Config, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	displayName := ""
	authorName := ""
	foundDisplayName := false
	foundAuthorName := false

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
		switch key {
		case displayNameKey:
			if foundDisplayName {
				return Config{}, fmt.Errorf("parse application config line %d: duplicate %s", lineNumber, displayNameKey)
			}
			value, err := parseValue(rawValue)
			if err != nil {
				return Config{}, fmt.Errorf("parse application config line %d: %w", lineNumber, err)
			}
			displayName = value
			foundDisplayName = true
		case authorNameKey:
			if foundAuthorName {
				return Config{}, fmt.Errorf("parse application config line %d: duplicate %s", lineNumber, authorNameKey)
			}
			value, err := parseValue(rawValue)
			if err != nil {
				return Config{}, fmt.Errorf("parse application config line %d: %w", lineNumber, err)
			}
			authorName = value
			foundAuthorName = true
		}
	}
	if err := scanner.Err(); err != nil {
		return Config{}, fmt.Errorf("read application config: %w", err)
	}

	displayName, err := validatePublicName(displayName, foundDisplayName, displayNameKey, maxDisplayNameLength)
	if err != nil {
		return Config{}, err
	}
	authorName, err = validatePublicName(authorName, foundAuthorName, authorNameKey, maxAuthorNameLength)
	if err != nil {
		return Config{}, err
	}

	return Config{DisplayName: displayName, AuthorName: authorName}, nil
}

func validatePublicName(value string, found bool, key string, maxLength int) (string, error) {
	if !found {
		return "", fmt.Errorf("validate application config: %s is required", key)
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("validate application config: %s cannot be empty", key)
	}
	if utf8.RuneCountInString(value) > maxLength {
		return "", fmt.Errorf("validate application config: %s exceeds %d characters", key, maxLength)
	}
	for _, character := range value {
		if unicode.IsControl(character) || character == '\u2028' || character == '\u2029' {
			return "", fmt.Errorf("validate application config: %s contains a control character", key)
		}
	}

	return value, nil
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
