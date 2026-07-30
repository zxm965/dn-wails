package notification

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type platformStub struct {
	available        bool
	authorized       bool
	initializeErr    error
	authorizationErr error
	sendErr          error
	initialized      bool
	cleanedUp        bool
	sent             []NativeNotification
	responseCallback func(response Response)
}

func (p *platformStub) Initialize(context.Context) error {
	if p.initializeErr != nil {
		return p.initializeErr
	}
	p.initialized = true
	return nil
}

func (p *platformStub) Cleanup(context.Context) {
	p.cleanedUp = true
}

func (p *platformStub) IsAvailable(context.Context) bool {
	return p.available
}

func (p *platformStub) CheckAuthorization(context.Context) (bool, error) {
	return p.authorized, p.authorizationErr
}

func (p *platformStub) RequestAuthorization(context.Context) (bool, error) {
	return p.authorized, p.authorizationErr
}

func (p *platformStub) Send(_ context.Context, notification NativeNotification) error {
	if p.sendErr != nil {
		return p.sendErr
	}
	p.sent = append(p.sent, notification)
	return nil
}

func (p *platformStub) OnResponse(_ context.Context, callback func(response Response)) {
	p.responseCallback = callback
}

func TestServiceSendMessage(t *testing.T) {
	t.Parallel()

	platform := &platformStub{available: true, authorized: true}
	service := newService(platform, func() string { return "generated-id" })
	if err := service.Initialize(context.Background(), nil, nil); err != nil {
		t.Fatalf("initialize service: %v", err)
	}

	content := strings.Repeat("消息", maxContentPreviewRunes)
	notificationID, err := service.SendMessage(context.Background(), Message{
		Sender:         "  产品小助手  ",
		Content:        "  " + content + "  ",
		ConversationID: "  conversation-1  ",
	}, Policy{Enabled: true, ShowPreview: true})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if notificationID != "generated-id" {
		t.Fatalf("expected generated notification ID, got %q", notificationID)
	}
	if len(platform.sent) != 1 {
		t.Fatalf("expected one notification, got %d", len(platform.sent))
	}

	notification := platform.sent[0]
	if notification.Title != "产品小助手" {
		t.Fatalf("expected trimmed sender, got %q", notification.Title)
	}
	if notification.Subtitle != "" {
		t.Fatalf("expected empty subtitle, got %q", notification.Subtitle)
	}
	if !strings.HasSuffix(notification.Body, "…") {
		t.Fatalf("expected truncated message preview, got %q", notification.Body)
	}
	if len([]rune(notification.Body)) != maxContentPreviewRunes {
		t.Fatalf("expected %d preview runes, got %d", maxContentPreviewRunes, len([]rune(notification.Body)))
	}
	if notification.Data["conversationId"] != "conversation-1" {
		t.Fatalf("expected conversation ID in notification data, got %q", notification.Data["conversationId"])
	}
}

func TestServiceRejectsInvalidMessage(t *testing.T) {
	t.Parallel()

	platform := &platformStub{available: true, authorized: true}
	service := newService(platform, func() string { return "generated-id" })
	if err := service.Initialize(context.Background(), nil, nil); err != nil {
		t.Fatalf("initialize service: %v", err)
	}

	tests := []struct {
		name      string
		message   Message
		expectErr error
	}{
		{
			name:      "requires sender",
			message:   Message{Sender: "  ", Content: "你好"},
			expectErr: ErrSenderRequired,
		},
		{
			name:      "requires content",
			message:   Message{Sender: "小助手", Content: "  "},
			expectErr: ErrContentRequired,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			_, err := service.SendMessage(context.Background(), test.message, Policy{Enabled: true, ShowPreview: true})
			if !errors.Is(err, test.expectErr) {
				t.Fatalf("expected error %v, got %v", test.expectErr, err)
			}
		})
	}
}

func TestServiceRequiresAuthorization(t *testing.T) {
	t.Parallel()

	platform := &platformStub{available: true, authorized: false}
	service := newService(platform, func() string { return "generated-id" })
	if err := service.Initialize(context.Background(), nil, nil); err != nil {
		t.Fatalf("initialize service: %v", err)
	}

	_, err := service.SendMessage(
		context.Background(),
		Message{Sender: "小助手", Content: "你好"},
		Policy{Enabled: true, ShowPreview: true},
	)
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("expected permission error, got %v", err)
	}
}

func TestServiceAppliesNotificationPolicy(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		policy    Policy
		expectErr error
	}{
		{name: "disabled", policy: Policy{}, expectErr: ErrDisabled},
		{name: "do not disturb", policy: Policy{Enabled: true, DoNotDisturb: true}, expectErr: ErrDoNotDisturb},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			platform := &platformStub{available: true, authorized: true}
			service := newService(platform, func() string { return "generated-id" })
			if err := service.Initialize(context.Background(), nil, nil); err != nil {
				t.Fatalf("initialize service: %v", err)
			}

			_, err := service.SendMessage(
				context.Background(),
				Message{Sender: "小助手", Content: "你好"},
				test.policy,
			)
			if !errors.Is(err, test.expectErr) {
				t.Fatalf("expected error %v, got %v", test.expectErr, err)
			}
		})
	}
}

func TestServiceHidesMessagePreview(t *testing.T) {
	t.Parallel()

	platform := &platformStub{available: true, authorized: true}
	service := newService(platform, func() string { return "generated-id" })
	if err := service.Initialize(context.Background(), nil, nil); err != nil {
		t.Fatalf("initialize service: %v", err)
	}

	_, err := service.SendMessage(
		context.Background(),
		Message{Sender: "小助手", Content: "敏感消息"},
		Policy{Enabled: true, ShowPreview: false},
	)
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if platform.sent[0].Body != "消息内容已隐藏" {
		t.Fatalf("expected hidden preview, got %q", platform.sent[0].Body)
	}
}

func TestServiceMapsNotificationActivation(t *testing.T) {
	t.Parallel()

	platform := &platformStub{available: true, authorized: true}
	service := newService(platform, func() string { return "generated-id" })

	var activation Activation
	if err := service.Initialize(context.Background(), func(value Activation) {
		activation = value
	}, nil); err != nil {
		t.Fatalf("initialize service: %v", err)
	}

	platform.responseCallback(Response{
		NotificationID: "notification-1",
		Data: map[string]string{
			"conversationId": "conversation-1",
		},
	})

	if activation.NotificationID != "notification-1" {
		t.Fatalf("expected notification ID, got %q", activation.NotificationID)
	}
	if activation.ConversationID != "conversation-1" {
		t.Fatalf("expected conversation ID, got %q", activation.ConversationID)
	}
}
