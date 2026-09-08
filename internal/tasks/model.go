package tasks

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maximumListTitleRunes = 120
	maximumTaskTitleRunes = 255
	maximumDetailsRunes   = 100_000
)

var (
	ErrInvalidData  = errors.New("invalid task data")
	ErrListNotFound = errors.New("task list not found")
	ErrTaskNotFound = errors.New("task not found")
	ErrConflict     = errors.New("task operation conflicts with current state")
	ErrUnavailable  = errors.New("云端任务暂不可用")
)

type RepeatRule struct {
	Frequency string `json:"frequency"`
	Interval  int    `json:"interval"`
	EndMode   string `json:"endMode"`
	EndDate   string `json:"endDate"`
	Count     int    `json:"count"`
}

type List struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	SortOrder int64  `json:"sortOrder"`
	IsDefault bool   `json:"isDefault"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Task struct {
	ID             int64      `json:"id"`
	ListID         int64      `json:"listId"`
	ParentID       int64      `json:"parentId"`
	Title          string     `json:"title"`
	Details        string     `json:"details"`
	ScheduledAt    string     `json:"scheduledAt"`
	DeadlineAt     string     `json:"deadlineAt"`
	TimeZone       string     `json:"timeZone"`
	Starred        bool       `json:"starred"`
	StarredAt      string     `json:"starredAt"`
	CompletedAt    string     `json:"completedAt"`
	SortOrder      int64      `json:"sortOrder"`
	Repeat         RepeatRule `json:"repeat"`
	RepeatSeriesID int64      `json:"repeatSeriesId"`
	CreatedAt      string     `json:"createdAt"`
	UpdatedAt      string     `json:"updatedAt"`
}

type Workspace struct {
	Lists []List `json:"lists"`
	Tasks []Task `json:"tasks"`
}

type ListInput struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

type TaskInput struct {
	ID          int64      `json:"id"`
	ListID      int64      `json:"listId"`
	ParentID    int64      `json:"parentId"`
	Title       string     `json:"title"`
	Details     string     `json:"details"`
	ScheduledAt string     `json:"scheduledAt"`
	DeadlineAt  string     `json:"deadlineAt"`
	TimeZone    string     `json:"timeZone"`
	Starred     bool       `json:"starred"`
	Repeat      RepeatRule `json:"repeat"`
}

type ReorderListsInput struct {
	OrderedIDs []int64 `json:"orderedIds"`
}

type ReorderTasksInput struct {
	ListID     int64   `json:"listId"`
	ParentID   int64   `json:"parentId"`
	OrderedIDs []int64 `json:"orderedIds"`
}

func normalizeListInput(input ListInput) (ListInput, error) {
	input.Title = strings.TrimSpace(input.Title)
	if input.ID < 0 || input.Title == "" {
		return ListInput{}, fmt.Errorf("%w: list id and title are invalid", ErrInvalidData)
	}
	if utf8.RuneCountInString(input.Title) > maximumListTitleRunes {
		return ListInput{}, fmt.Errorf("%w: list title must not exceed %d characters", ErrInvalidData, maximumListTitleRunes)
	}
	return input, nil
}

func normalizeTaskInput(input TaskInput) (TaskInput, error) {
	input.Title = strings.TrimSpace(input.Title)
	if input.ID < 0 || input.ListID <= 0 || input.ParentID < 0 || input.Title == "" {
		return TaskInput{}, fmt.Errorf("%w: task id, list, parent or title is invalid", ErrInvalidData)
	}
	if input.ID > 0 && input.ParentID == input.ID {
		return TaskInput{}, fmt.Errorf("%w: task cannot be its own parent", ErrInvalidData)
	}
	if utf8.RuneCountInString(input.Title) > maximumTaskTitleRunes {
		return TaskInput{}, fmt.Errorf("%w: task title must not exceed %d characters", ErrInvalidData, maximumTaskTitleRunes)
	}
	if utf8.RuneCountInString(input.Details) > maximumDetailsRunes {
		return TaskInput{}, fmt.Errorf("%w: task details must not exceed %d characters", ErrInvalidData, maximumDetailsRunes)
	}
	var err error
	input.ScheduledAt, err = normalizeTimestamp(input.ScheduledAt)
	if err != nil {
		return TaskInput{}, err
	}
	input.DeadlineAt, err = normalizeTimestamp(input.DeadlineAt)
	if err != nil {
		return TaskInput{}, err
	}
	input.TimeZone = strings.TrimSpace(input.TimeZone)
	if input.TimeZone == "" {
		input.TimeZone = "UTC"
	}
	if _, err := time.LoadLocation(input.TimeZone); err != nil {
		return TaskInput{}, fmt.Errorf("%w: time zone is invalid", ErrInvalidData)
	}
	input.Repeat, err = normalizeRepeat(input.Repeat)
	if err != nil {
		return TaskInput{}, err
	}
	if input.ParentID > 0 && input.Repeat.Frequency != "none" {
		return TaskInput{}, fmt.Errorf("%w: subtasks cannot repeat", ErrConflict)
	}
	if input.Repeat.Frequency != "none" && input.ScheduledAt == "" && input.DeadlineAt == "" {
		return TaskInput{}, fmt.Errorf("%w: repeating tasks require a date", ErrInvalidData)
	}
	return input, nil
}

func normalizeTimestamp(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return "", fmt.Errorf("%w: timestamp must use RFC3339", ErrInvalidData)
	}
	return parsed.UTC().Format(time.RFC3339Nano), nil
}

func normalizeRepeat(rule RepeatRule) (RepeatRule, error) {
	rule.Frequency = strings.ToLower(strings.TrimSpace(rule.Frequency))
	if rule.Frequency == "" {
		rule.Frequency = "none"
	}
	if rule.Frequency == "none" {
		return RepeatRule{Frequency: "none", Interval: 1, EndMode: "never"}, nil
	}
	if rule.Frequency != "daily" && rule.Frequency != "weekly" && rule.Frequency != "monthly" && rule.Frequency != "yearly" {
		return RepeatRule{}, fmt.Errorf("%w: unsupported repeat frequency", ErrInvalidData)
	}
	if rule.Interval == 0 {
		rule.Interval = 1
	}
	if rule.Interval < 1 || rule.Interval > 999 {
		return RepeatRule{}, fmt.Errorf("%w: repeat interval must be between 1 and 999", ErrInvalidData)
	}
	rule.EndMode = strings.ToLower(strings.TrimSpace(rule.EndMode))
	if rule.EndMode == "" {
		rule.EndMode = "never"
	}
	switch rule.EndMode {
	case "never":
		rule.EndDate = ""
		rule.Count = 0
	case "date":
		if _, err := time.Parse("2006-01-02", rule.EndDate); err != nil {
			return RepeatRule{}, fmt.Errorf("%w: repeat end date is invalid", ErrInvalidData)
		}
		rule.Count = 0
	case "count":
		if rule.Count < 2 || rule.Count > 9999 {
			return RepeatRule{}, fmt.Errorf("%w: repeat count must be between 2 and 9999", ErrInvalidData)
		}
		rule.EndDate = ""
	default:
		return RepeatRule{}, fmt.Errorf("%w: unsupported repeat end mode", ErrInvalidData)
	}
	return rule, nil
}

func advanceTimestamp(value string, rule RepeatRule, timeZone string) (string, error) {
	if value == "" {
		return "", nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return "", fmt.Errorf("advance repeating task timestamp: %w", err)
	}
	location, err := time.LoadLocation(timeZone)
	if err != nil {
		return "", fmt.Errorf("%w: time zone is invalid", ErrInvalidData)
	}
	local := parsed.In(location)
	switch rule.Frequency {
	case "daily":
		local = local.AddDate(0, 0, rule.Interval)
	case "weekly":
		local = local.AddDate(0, 0, 7*rule.Interval)
	case "monthly":
		local = addMonthsClamped(local, rule.Interval)
	case "yearly":
		local = addYearsClamped(local, rule.Interval)
	default:
		return "", fmt.Errorf("%w: unsupported repeat frequency", ErrInvalidData)
	}
	return local.UTC().Format(time.RFC3339Nano), nil
}

func addMonthsClamped(value time.Time, months int) time.Time {
	year, month, day := value.Date()
	target := time.Date(year, month+time.Month(months), 1, value.Hour(), value.Minute(), value.Second(), value.Nanosecond(), value.Location())
	lastDay := time.Date(target.Year(), target.Month()+1, 0, value.Hour(), value.Minute(), value.Second(), value.Nanosecond(), value.Location()).Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(target.Year(), target.Month(), day, value.Hour(), value.Minute(), value.Second(), value.Nanosecond(), value.Location())
}

func addYearsClamped(value time.Time, years int) time.Time {
	year, month, day := value.Date()
	lastDay := time.Date(year+years, month+1, 0, value.Hour(), value.Minute(), value.Second(), value.Nanosecond(), value.Location()).Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(year+years, month, day, value.Hour(), value.Minute(), value.Second(), value.Nanosecond(), value.Location())
}
