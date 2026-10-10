package shortcut

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Native is the system hotkey registration provided by Wails.
type Native interface {
	Register(accelerator string, callback func()) error
	Unregister(accelerator string) error
}

const (
	pollInterval = 20 * time.Millisecond
	// A queued WM_HOTKEY can arrive after polling has observed key release.
	duplicateWindow = 150 * time.Millisecond
)

type keyState struct {
	down    bool
	matches bool
}

type fallbackService struct {
	mu            sync.Mutex
	native        Native
	readKeys      func(uintptr) keyState
	registrations map[string]*registration
}

type registration struct {
	mu          sync.Mutex
	active      bool
	down        bool
	fired       bool
	running     bool
	lastTrigger time.Time
	callback    func()
	stop        chan struct{}
	done        chan struct{}
}

func newFallback(native Native, readKeys func(uintptr) keyState) Native {
	return &fallbackService{native: native, readKeys: readKeys, registrations: make(map[string]*registration)}
}

func functionKey(accelerator string) (uintptr, error) {
	key := strings.ToLower(strings.TrimSpace(accelerator))
	number, err := strconv.Atoi(strings.TrimPrefix(key, "ctrl+f"))
	if err != nil || number < 1 || number > 11 || key != fmt.Sprintf("ctrl+f%d", number) {
		return 0, fmt.Errorf("unsupported Dragon Nest shortcut %q: expected Ctrl+F1 through Ctrl+F11", accelerator)
	}
	return uintptr(0x70 + number - 1), nil
}

func (s *fallbackService) Register(accelerator string, callback func()) error {
	key, err := functionKey(accelerator)
	if err != nil {
		return err
	}
	if callback == nil {
		return fmt.Errorf("shortcut callback must not be nil")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.registrations[accelerator]; exists {
		return fmt.Errorf("shortcut %q is already registered", accelerator)
	}
	initial := s.readKeys(key)
	r := &registration{
		down: initial.down, fired: initial.down, callback: callback,
		stop: make(chan struct{}), done: make(chan struct{}),
	}
	// Keep system registration authoritative: conflicts must remain visible.
	if err := s.native.Register(accelerator, func() { r.trigger(time.Now()) }); err != nil {
		return err
	}
	r.mu.Lock()
	r.active = true
	r.mu.Unlock()
	s.registrations[accelerator] = r
	go func() {
		defer close(r.done)
		ticker := time.NewTicker(pollInterval)
		defer ticker.Stop()
		for {
			select {
			case <-r.stop:
				return
			case now := <-ticker.C:
				r.observe(s.readKeys(key), now)
			}
		}
	}()
	return nil
}

func (s *fallbackService) Unregister(accelerator string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, exists := s.registrations[accelerator]
	if !exists {
		return fmt.Errorf("shortcut %q is not registered", accelerator)
	}
	r.mu.Lock()
	r.active = false
	r.mu.Unlock()
	if err := s.native.Unregister(accelerator); err != nil {
		r.mu.Lock()
		r.active = true
		r.mu.Unlock()
		return err
	}
	close(r.stop)
	<-r.done
	delete(s.registrations, accelerator)
	return nil
}

func (r *registration) observe(state keyState, now time.Time) {
	r.mu.Lock()
	rising := state.down && !r.down
	r.down = state.down
	if !state.down {
		r.fired = false
	}
	trigger := rising && state.matches
	if trigger {
		r.triggerLocked(now)
	}
	r.mu.Unlock()
}

func (r *registration) trigger(now time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.triggerLocked(now)
}

func (r *registration) triggerLocked(now time.Time) {
	if !r.active || r.fired || r.running || (!r.lastTrigger.IsZero() && now.Sub(r.lastTrigger) < duplicateWindow) {
		return
	}
	r.fired = true
	r.running = true
	r.lastTrigger = now
	go func() {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("global shortcut callback panic: %v", recovered)
			}
			r.mu.Lock()
			r.running = false
			r.mu.Unlock()
		}()
		r.callback()
	}()
}
