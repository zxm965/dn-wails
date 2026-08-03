package notification

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"
)

const maxContentPreviewRunes = 160

var (
	ErrUnavailable      = errors.New("system notifications are unavailable")
	ErrPermissionDenied = errors.New("system notification permission is denied")
	ErrDisabled         = errors.New("system notifications are disabled in application settings")
	ErrDoNotDisturb     = errors.New("system notifications are paused by do not disturb")
	ErrSenderRequired   = errors.New("message sender is required")
	ErrContentRequired  = errors.New("message content is required")
)

// Message describes a chat message that should be presented as a system notification.
type Message struct {
	ID             string
	Sender         string
	Content        string
	ConversationID string
}

type Policy struct {
	Enabled      bool
	ShowPreview  bool
	DoNotDisturb bool
}

// Status describes the current system notification capability.
type Status struct {
	Available  bool
	Authorized bool
}

// NativeNotification is the platform-neutral notification payload.
type NativeNotification struct {
	ID       string
	Title    string
	Subtitle string
	Body     string
	Data     map[string]string
}

// Response describes a user interaction reported by the native notification platform.
type Response struct {
	NotificationID string
	ActionID       string
	Data           map[string]string
	Err            error
}

// Activation is emitted when the user opens a message notification.
type Activation struct {
	NotificationID string `json:"notificationId"`
	ConversationID string `json:"conversationId,omitempty"`
}

// Platform isolates Wails and operating-system notification details from message rules.
type Platform interface {
	CheckAuthorization() (bool, error)
	RequestAuthorization() (bool, error)
	Send(notification NativeNotification) error
	OnResponse(callback func(response Response))
}

// Service validates message notifications and delegates delivery to the current platform.
type Service struct {
	platform    Platform
	idGenerator func() string
}

func NewService(platform Platform) *Service {
	return newService(platform, newNotificationID)
}

func newService(platform Platform, idGenerator func() string) *Service {
	return &Service{
		platform:    platform,
		idGenerator: idGenerator,
	}
}

func (s *Service) Initialize(
	onActivation func(activation Activation),
	onError func(err error),
) {
	s.platform.OnResponse(func(response Response) {
		if response.Err != nil {
			if onError != nil {
				onError(response.Err)
			}
			return
		}
		if onActivation == nil {
			return
		}

		onActivation(Activation{
			NotificationID: response.NotificationID,
			ConversationID: response.Data["conversationId"],
		})
	})
}

func (s *Service) Status() (Status, error) {
	authorized, err := s.platform.CheckAuthorization()
	if err != nil {
		return Status{Available: true, Authorized: false}, fmt.Errorf("check system notification permission: %w", err)
	}

	return Status{Available: true, Authorized: authorized}, nil
}

func (s *Service) RequestAuthorization() (bool, error) {
	authorized, err := s.platform.RequestAuthorization()
	if err != nil {
		return false, fmt.Errorf("request system notification permission: %w", err)
	}

	return authorized, nil
}

func (s *Service) SendMessage(message Message, policy Policy) (string, error) {
	sender := strings.TrimSpace(message.Sender)
	if sender == "" {
		return "", ErrSenderRequired
	}

	content := strings.TrimSpace(message.Content)
	if content == "" {
		return "", ErrContentRequired
	}
	if !policy.Enabled {
		return "", ErrDisabled
	}
	if policy.DoNotDisturb {
		return "", ErrDoNotDisturb
	}

	status, err := s.Status()
	if err != nil {
		return "", err
	}
	if !status.Available {
		return "", ErrUnavailable
	}
	if !status.Authorized {
		return "", ErrPermissionDenied
	}

	notificationID := strings.TrimSpace(message.ID)
	if notificationID == "" {
		notificationID = s.idGenerator()
	}

	body := contentPreview(content)
	if !policy.ShowPreview {
		body = "您收到一条消息"
	}

	nativeNotification := NativeNotification{
		ID:    notificationID,
		Title: sender,
		Body:  body,
		Data: map[string]string{
			"conversationId": strings.TrimSpace(message.ConversationID),
		},
	}

	if err := s.platform.Send(nativeNotification); err != nil {
		return "", fmt.Errorf("send system notification: %w", err)
	}

	return notificationID, nil
}

func contentPreview(content string) string {
	runes := []rune(content)
	if len(runes) <= maxContentPreviewRunes {
		return content
	}

	return string(runes[:maxContentPreviewRunes-1]) + "…"
}

var fallbackIDCounter atomic.Uint64

func newNotificationID() string {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err == nil {
		return "message-" + hex.EncodeToString(randomBytes)
	}

	sequence := fallbackIDCounter.Add(1)
	return fmt.Sprintf("message-%d-%d", time.Now().UnixNano(), sequence)
}
