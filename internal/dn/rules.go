package dn

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	defaultPageSize = 20
	maximumPageSize = 100
)

var (
	ErrInvalidData = errors.New("invalid dn system data")
	ErrNotFound    = errors.New("dn system record not found")
	ErrConflict    = errors.New("dn system record conflicts with existing data")
)

func normalizeSiteMessageInput(input SiteMessageInput, fallback time.Time) (SiteMessageInput, error) {
	input.Level = strings.TrimSpace(input.Level)
	input.Title = strings.TrimSpace(input.Title)
	input.Content = strings.TrimSpace(input.Content)
	input.ActionLabel = strings.TrimSpace(input.ActionLabel)
	input.ActionURL = strings.TrimSpace(input.ActionURL)
	input.ActionTarget = strings.TrimSpace(input.ActionTarget)
	input.PublishedAt = strings.TrimSpace(input.PublishedAt)
	input.ExpiresAt = strings.TrimSpace(input.ExpiresAt)
	if input.Title == "" || len([]rune(input.Title)) > 200 || len([]rune(input.Content)) > 5000 {
		return SiteMessageInput{}, fmt.Errorf("%w: invalid site message title or content", ErrInvalidData)
	}
	if len([]rune(input.ActionLabel)) > 30 || len([]rune(input.ActionURL)) > 2048 {
		return SiteMessageInput{}, fmt.Errorf("%w: site message action is too long", ErrInvalidData)
	}
	if !containsString([]string{MessageLevelInfo, MessageLevelSuccess, MessageLevelWarning, MessageLevelError}, input.Level) {
		return SiteMessageInput{}, fmt.Errorf("%w: unsupported site message level", ErrInvalidData)
	}
	if input.ActionTarget == "" {
		input.ActionTarget = MessageTargetSelf
	}
	if !containsString([]string{MessageTargetSelf, MessageTargetBlank}, input.ActionTarget) {
		return SiteMessageInput{}, fmt.Errorf("%w: unsupported site message target", ErrInvalidData)
	}
	if err := validateActionURL(input.ActionURL); err != nil {
		return SiteMessageInput{}, err
	}
	publishedAt, err := normalizeRFC3339(input.PublishedAt, fallback)
	if err != nil {
		return SiteMessageInput{}, fmt.Errorf("%w: invalid site message publish time", ErrInvalidData)
	}
	input.PublishedAt = publishedAt
	if input.ExpiresAt != "" {
		expiresAt, parseErr := normalizeRFC3339(input.ExpiresAt, time.Time{})
		if parseErr != nil {
			return SiteMessageInput{}, fmt.Errorf("%w: invalid site message expiry", ErrInvalidData)
		}
		publishedTime, _ := time.Parse(time.RFC3339Nano, publishedAt)
		expiresTime, _ := time.Parse(time.RFC3339Nano, expiresAt)
		if !expiresTime.After(publishedTime) {
			return SiteMessageInput{}, fmt.Errorf("%w: site message expiry must be after publish time", ErrInvalidData)
		}
		input.ExpiresAt = expiresAt
	}
	return input, nil
}

func validateActionURL(value string) error {
	if value == "" {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || (!strings.HasPrefix(value, "/") && parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("%w: invalid site message action URL", ErrInvalidData)
	}
	return nil
}

func normalizeRFC3339(value string, fallback time.Time) (string, error) {
	if value == "" {
		if fallback.IsZero() {
			return "", errors.New("time is required")
		}
		return fallback.UTC().Format(time.RFC3339Nano), nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339Nano, value)
	}
	if err != nil {
		return "", err
	}
	return parsed.UTC().Format(time.RFC3339Nano), nil
}

func paginate[T any](items []T, page int, pageSize int) ([]T, ListMeta) {
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maximumPageSize {
		pageSize = maximumPageSize
	}
	if page <= 0 {
		page = 1
	}
	total := len(items)
	totalPages := 0
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
		if page > totalPages {
			page = totalPages
		}
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	result := append([]T(nil), items[start:end]...)
	return result, ListMeta{Total: total, TotalPages: totalPages, Page: page, PageSize: pageSize}
}

func containsString(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}
