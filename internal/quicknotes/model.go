package quicknotes

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

const (
	maximumTitleRunes = 120
	maximumBodyRunes  = 100_000
)

var (
	ErrInvalidNote  = errors.New("invalid quick note")
	ErrNoteNotFound = errors.New("quick note not found")
	ErrUnavailable  = errors.New("云端快速笔记暂不可用")
)

type Note struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Pinned    bool   `json:"pinned"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type NoteInput struct {
	ID      int64  `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
	Pinned  bool   `json:"pinned"`
}

func normalizeInput(input NoteInput) (NoteInput, error) {
	input.Title = strings.TrimSpace(input.Title)
	if input.ID < 0 {
		return NoteInput{}, fmt.Errorf("%w: note id must not be negative", ErrInvalidNote)
	}
	if input.Title == "" {
		input.Title = deriveTitle(input.Content)
	}
	if utf8.RuneCountInString(input.Title) > maximumTitleRunes {
		return NoteInput{}, fmt.Errorf("%w: title must not exceed %d characters", ErrInvalidNote, maximumTitleRunes)
	}
	if utf8.RuneCountInString(input.Content) > maximumBodyRunes {
		return NoteInput{}, fmt.Errorf("%w: content must not exceed %d characters", ErrInvalidNote, maximumBodyRunes)
	}
	return input, nil
}

func deriveTitle(content string) string {
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		runes := []rune(line)
		if len(runes) > maximumTitleRunes {
			return string(runes[:maximumTitleRunes])
		}
		return line
	}
	return "未命名笔记"
}
