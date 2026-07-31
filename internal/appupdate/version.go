package appupdate

import (
	"fmt"
	"strconv"
	"strings"
)

type semanticVersion struct {
	major uint64
	minor uint64
	patch uint64
}

func normalizeVersion(value string) string {
	return strings.TrimPrefix(strings.TrimSpace(value), "v")
}

func parseVersion(value string) (semanticVersion, error) {
	normalized := normalizeVersion(value)
	parts := strings.Split(normalized, ".")
	if len(parts) != 3 {
		return semanticVersion{}, fmt.Errorf("%w: %q", ErrInvalidVersion, value)
	}

	parsed := semanticVersion{}
	targets := []*uint64{&parsed.major, &parsed.minor, &parsed.patch}
	for index, part := range parts {
		if part == "" || (len(part) > 1 && part[0] == '0') {
			return semanticVersion{}, fmt.Errorf("%w: %q", ErrInvalidVersion, value)
		}
		number, err := strconv.ParseUint(part, 10, 64)
		if err != nil {
			return semanticVersion{}, fmt.Errorf("%w: %q", ErrInvalidVersion, value)
		}
		*targets[index] = number
	}
	return parsed, nil
}

func compareVersions(current string, latest string) (int, error) {
	currentVersion, err := parseVersion(current)
	if err != nil {
		return 0, err
	}
	latestVersion, err := parseVersion(latest)
	if err != nil {
		return 0, err
	}

	currentParts := []uint64{currentVersion.major, currentVersion.minor, currentVersion.patch}
	latestParts := []uint64{latestVersion.major, latestVersion.minor, latestVersion.patch}
	for index := range currentParts {
		if currentParts[index] < latestParts[index] {
			return -1, nil
		}
		if currentParts[index] > latestParts[index] {
			return 1, nil
		}
	}
	return 0, nil
}
