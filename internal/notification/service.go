package notification

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const maxContentPreviewRunes = 160

var (
	ErrUnavailable      = errors.New("system notifications are unavailable")
	ErrNotInitialized   = errors.New("system notifications are not initialized")
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
	Initialize(ctx context.Context) error
	Cleanup(ctx context.Context)
	IsAvailable(ctx context.Context) bool
	CheckAuthorization(ctx context.Context) (bool, error)
	RequestAuthorization(ctx context.Context) (bool, error)
	Send(ctx context.Context, notification NativeNotification) error
	OnResponse(ctx context.Context, callback func(response Response))
}

// Service validates message notifications and delegates delivery to the current platform.
type Service struct {
	platform    Platform
	idGenerator func() string

	mu                 sync.RWMutex
	initializing       bool
	initialized        bool
	initializationDone chan struct{}
	initializationErr  error
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
	ctx context.Context,
	onActivation func(activation Activation),
	onError func(err error),
) error {
	s.mu.Lock()
	if s.initialized {
		s.mu.Unlock()
		return nil
	}
	if s.initializing {
		done := s.initializationDone
		s.mu.Unlock()
		return s.waitForInitialization(ctx, done)
	}

	s.initializing = true
	s.initializationDone = make(chan struct{})
	s.initializationErr = nil
	done := s.initializationDone
	s.mu.Unlock()

	if !s.platform.IsAvailable(ctx) {
		s.finishInitialization(done, ErrUnavailable)
		return ErrUnavailable
	}
	if err := s.platform.Initialize(ctx); err != nil {
		initializationErr := fmt.Errorf("initialize system notifications: %w", err)
		s.finishInitialization(done, initializationErr)
		return initializationErr
	}

	s.platform.OnResponse(ctx, func(response Response) {
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

	s.finishInitialization(done, nil)

	return nil
}

func (s *Service) Cleanup(ctx context.Context) {
	s.mu.RLock()
	done := s.initializationDone
	s.mu.RUnlock()
	if done != nil {
		_ = s.waitForInitialization(ctx, done)
	}

	s.mu.Lock()
	wasInitialized := s.initialized
	s.initialized = false
	s.initializationErr = nil
	s.initializationDone = nil
	s.mu.Unlock()

	if wasInitialized {
		s.platform.Cleanup(ctx)
	}
}

func (s *Service) Status(ctx context.Context) (Status, error) {
	available := s.platform.IsAvailable(ctx)
	if !available {
		return Status{Available: false, Authorized: false}, nil
	}
	if err := s.ensureInitialized(ctx); err != nil {
		return Status{Available: true, Authorized: false}, err
	}

	authorized, err := s.platform.CheckAuthorization(ctx)
	if err != nil {
		return Status{Available: true, Authorized: false}, fmt.Errorf("check system notification permission: %w", err)
	}

	return Status{Available: true, Authorized: authorized}, nil
}

func (s *Service) RequestAuthorization(ctx context.Context) (bool, error) {
	if !s.platform.IsAvailable(ctx) {
		return false, ErrUnavailable
	}
	if err := s.ensureInitialized(ctx); err != nil {
		return false, err
	}

	authorized, err := s.platform.RequestAuthorization(ctx)
	if err != nil {
		return false, fmt.Errorf("request system notification permission: %w", err)
	}

	return authorized, nil
}

func (s *Service) SendMessage(ctx context.Context, message Message, policy Policy) (string, error) {
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

	status, err := s.Status(ctx)
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
		body = "消息内容已隐藏"
	}

	nativeNotification := NativeNotification{
		ID:    notificationID,
		Title: sender,
		Body:  body,
		Data: map[string]string{
			"conversationId": strings.TrimSpace(message.ConversationID),
		},
	}

	if err := s.platform.Send(ctx, nativeNotification); err != nil {
		return "", fmt.Errorf("send system notification: %w", err)
	}

	return notificationID, nil
}

func (s *Service) ensureInitialized(ctx context.Context) error {
	s.mu.RLock()
	if s.initialized {
		s.mu.RUnlock()
		return nil
	}
	done := s.initializationDone
	initializationErr := s.initializationErr
	s.mu.RUnlock()

	if done == nil {
		if initializationErr != nil {
			return initializationErr
		}
		return ErrNotInitialized
	}

	return s.waitForInitialization(ctx, done)
}

func (s *Service) waitForInitialization(ctx context.Context, done <-chan struct{}) error {
	select {
	case <-done:
	case <-ctx.Done():
		return fmt.Errorf("wait for system notification initialization: %w", ctx.Err())
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.initialized {
		return nil
	}
	if s.initializationErr != nil {
		return s.initializationErr
	}

	return ErrNotInitialized
}

func (s *Service) finishInitialization(done chan struct{}, err error) {
	s.mu.Lock()
	s.initializing = false
	s.initialized = err == nil
	s.initializationErr = err
	close(done)
	s.mu.Unlock()
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
