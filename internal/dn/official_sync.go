package dn

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	officialBaseURL          = "https://dn.web.sdo.com/web12"
	officialNewsListURL      = officialBaseURL + "/handler/GetNewsList.ashx"
	officialNewsDetailURL    = officialBaseURL + "/news/newsContent.html"
	officialCategories       = "102,103,104,8021,8022,8023,122,7364,8167"
	officialSyncFreshness    = 30 * time.Minute
	officialForceMinInterval = 2 * time.Minute
	officialInitialLookback  = 48 * time.Hour
)

type officialAPIResponse struct {
	IsSuccess    bool   `json:"IsSuccess"`
	Message      string `json:"Message"`
	ReturnCode   int    `json:"ReturnCode"`
	ReturnObject string `json:"ReturnObject"`
}

type officialListPayload struct {
	DataList [][]any `json:"dataList"`
}

type officialNewsItem struct {
	SourceID     int
	CategoryCode string
	Title        string
	Summary      string
	URL          string
	PublishedAt  time.Time
	IsTop        bool
	IsHot        bool
}

func (s *Service) SyncOfficialMessages() (OfficialMessageSyncResult, error) {
	return s.syncOfficialMessages(true)
}

func (s *Service) syncOfficialMessages(force bool) (OfficialMessageSyncResult, error) {
	s.mu.RLock()
	var authErr error
	if force {
		_, authErr = s.adminUserLocked(time.Now())
	} else {
		_, authErr = s.authenticatedUserLocked(time.Now())
	}
	s.mu.RUnlock()
	if authErr != nil {
		return OfficialMessageSyncResult{}, authErr
	}

	s.syncMu.Lock()
	defer s.syncMu.Unlock()

	s.mu.RLock()
	lastSyncedAt := s.state.OfficialSync.LastSyncedAt
	s.mu.RUnlock()
	freshness := officialSyncFreshness
	if force {
		freshness = officialForceMinInterval
	}
	if lastSync, err := time.Parse(time.RFC3339Nano, lastSyncedAt); err == nil && time.Since(lastSync) < freshness {
		return OfficialMessageSyncResult{Skipped: true, SyncedAt: lastSyncedAt}, nil
	}

	items, err := s.fetchOfficialNews()
	if err != nil {
		return OfficialMessageSyncResult{}, err
	}
	if len(items) == 0 {
		return OfficialMessageSyncResult{}, fmt.Errorf("官网没有返回可用消息")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if force {
		if _, err := s.adminUserLocked(time.Now()); err != nil {
			return OfficialMessageSyncResult{}, err
		}
	} else if _, err := s.authenticatedUserLocked(time.Now()); err != nil {
		return OfficialMessageSyncResult{}, err
	}

	next := cloneState(s.state)
	cursor, _ := time.Parse(time.RFC3339Nano, next.OfficialSync.LatestPublishedAt)
	cutoff := time.Now().Add(-officialInitialLookback)
	candidates := make([]officialNewsItem, 0, len(items))
	for _, item := range items {
		if !cursor.IsZero() {
			if item.PublishedAt.After(cursor) {
				candidates = append(candidates, item)
			}
			continue
		}
		if !item.PublishedAt.Before(cutoff) {
			candidates = append(candidates, item)
		}
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].PublishedAt.Before(candidates[j].PublishedAt) })
	if len(candidates) > 20 {
		candidates = candidates[len(candidates)-20:]
	}

	published := 0
	for _, item := range candidates {
		sourceKey := strconv.Itoa(item.SourceID)
		if hasMessageSourceKey(next.Messages, "dragon-nest-official", sourceKey) {
			continue
		}
		label, level := officialMessageMeta(item.CategoryCode)
		content := item.Summary
		if content == "" {
			content = fmt.Sprintf("《龙之谷》官网发布了新的%s，点击查看详情。", label)
		}
		next.Messages = append(next.Messages, SiteMessage{
			ID:           next.NextMessageID,
			Source:       "dragon-nest-official",
			SourceKey:    sourceKey,
			Level:        level,
			Title:        item.Title,
			Content:      content,
			ActionLabel:  "查看官网",
			ActionURL:    item.URL,
			ActionTarget: MessageTargetBlank,
			Popup:        true,
			Status:       1,
			PublishedAt:  item.PublishedAt.UTC().Format(time.RFC3339Nano),
			Metadata: &SiteMessageMetadata{
				CategoryCode: item.CategoryCode,
				IsTop:        item.IsTop,
				IsHot:        item.IsHot,
				SourceID:     item.SourceID,
			},
		})
		next.NextMessageID++
		published++
	}

	latest := items[0].PublishedAt
	for _, item := range items[1:] {
		if item.PublishedAt.After(latest) {
			latest = item.PublishedAt
		}
	}
	syncedAt := time.Now().UTC().Format(time.RFC3339Nano)
	next.OfficialSync = officialSyncState{
		LatestPublishedAt: latest.UTC().Format(time.RFC3339Nano),
		LastSyncedAt:      syncedAt,
	}
	if err := s.commit(next); err != nil {
		return OfficialMessageSyncResult{}, err
	}
	return OfficialMessageSyncResult{
		Fetched:   len(items),
		Published: published,
		SyncedAt:  syncedAt,
	}, nil
}

func (s *Service) fetchOfficialNews() ([]officialNewsItem, error) {
	return fetchOfficialNews(s.httpClient)
}

func fetchOfficialNews(client *http.Client) ([]officialNewsItem, error) {
	form := url.Values{
		"CategoryCode": {officialCategories},
		"PageSize":     {"60"},
		"PageIndex":    {"0"},
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, officialNewsListURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("创建官网消息请求失败: %w", err)
	}
	request.Header.Set("Accept", "application/json, text/plain, */*")
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	request.Header.Set("Referer", officialBaseURL+"/home/")
	request.Header.Set("User-Agent", "DN-Wails/1.0 (+official-message-sync)")

	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("官网消息查询失败: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil, fmt.Errorf("官网消息查询失败：HTTP %d", response.StatusCode)
	}

	var result officialAPIResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 4*1024*1024)).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析官网消息响应失败: %w", err)
	}
	if !result.IsSuccess || result.ReturnObject == "" {
		message := strings.TrimSpace(result.Message)
		if message == "" {
			message = fmt.Sprintf("官网消息查询失败：%d", result.ReturnCode)
		}
		return nil, fmt.Errorf("%s", message)
	}

	var payload officialListPayload
	if err := json.Unmarshal([]byte(result.ReturnObject), &payload); err != nil {
		return nil, fmt.Errorf("解析官网消息列表失败: %w", err)
	}
	rows := payload.DataList
	if len(rows) > 0 {
		rows = rows[1:]
	}
	items := make([]officialNewsItem, 0, len(rows))
	for _, row := range rows {
		if item, ok := parseOfficialListItem(row); ok {
			items = append(items, item)
		}
	}
	return items, nil
}

func parseOfficialListItem(row []any) (officialNewsItem, bool) {
	if len(row) <= 15 {
		return officialNewsItem{}, false
	}
	sourceID := asInteger(row[0])
	categoryCode := asString(row[3])
	title := asString(row[8])
	publishedAt, ok := parseOfficialDate(row[14])
	if sourceID <= 0 || categoryCode == "" || title == "" || !ok {
		return officialNewsItem{}, false
	}
	actionURL := normalizeOfficialURL(row[15])
	if actionURL == "" {
		actionURL = fmt.Sprintf("%s?ID=%d&CategoryID=%s", officialNewsDetailURL, sourceID, url.QueryEscape(categoryCode))
	}
	return officialNewsItem{
		SourceID:     sourceID,
		CategoryCode: categoryCode,
		Title:        title,
		Summary:      asString(row[10]),
		URL:          actionURL,
		PublishedAt:  publishedAt,
		IsTop:        asString(row[6]) == "1",
		IsHot:        asString(row[7]) == "1",
	}, true
}

func parseOfficialDate(value any) (time.Time, bool) {
	raw := asString(value)
	if raw == "" {
		return time.Time{}, false
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed, true
	}
	location := time.FixedZone("CST", 8*60*60)
	for _, layout := range []string{"2006-01-02 15:04:05", "2006/01/02 15:04:05", "2006-01-02 15:04"} {
		if parsed, err := time.ParseInLocation(layout, raw, location); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func normalizeOfficialURL(value any) string {
	raw := asString(value)
	if raw == "" {
		return ""
	}
	base, _ := url.Parse(officialBaseURL)
	reference, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	resolved := base.ResolveReference(reference)
	if resolved.Scheme != "http" && resolved.Scheme != "https" {
		return ""
	}
	return resolved.String()
}

func officialMessageMeta(categoryCode string) (string, string) {
	switch categoryCode {
	case "103":
		return "活动", MessageLevelSuccess
	case "104":
		return "公告", MessageLevelWarning
	case "8167":
		return "版本", MessageLevelInfo
	default:
		return "资讯", MessageLevelInfo
	}
}

func hasMessageSourceKey(items []SiteMessage, source string, sourceKey string) bool {
	for _, item := range items {
		if item.Source == source && item.SourceKey == sourceKey {
			return true
		}
	}
	return false
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func asInteger(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	default:
		parsed, _ := strconv.Atoi(asString(value))
		return parsed
	}
}
