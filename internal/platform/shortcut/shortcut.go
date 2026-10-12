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
	watchKeys     func(uintptr, func(keyState)) (func() error, error)
	registrations map[string]*registration
}

type registration struct {
	nativeRegistered bool
	mu               sync.Mutex
	active           bool
	down             bool
	eventDown        bool
	fired            bool
	running          bool
	lastTrigger      time.Time
	callback         func()
	stop             chan struct{}
	done             chan struct{}
	stopWatching     func() error
}

func newFallback(native Native, readKeys func(uintptr) keyState) Native {
	return &fallbackService{native: native, readKeys: readKeys, registrations: make(map[string]*registration)}
}

func functionKey(accelerator string) (uintptr, error) {
	key := strings.ToLower(strings.TrimSpace(accelerator))
	number, err := strconv.Atoi(strings.TrimPrefix(key, "f"))
	if err != nil || number < 1 || number > 12 || key != fmt.Sprintf("f%d", number) {
		return 0, fmt.Errorf("unsupported Dragon Nest shortcut %q: expected F1 through F12", accelerator)
	}
	return uintptr(0x70 + number - 1), nil
}

func readFunctionKeyState(key uintptr, isDown func(uintptr) bool) keyState {
	down := isDown(key)
	return keyState{
		down: down,
		matches: down && !isDown(0x11) && !isDown(0x10) && !isDown(0x12) &&
			!isDown(0x5B) && !isDown(0x5C),
	}
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
	// Windows reserves F12 for debuggers; observe it without RegisterHotKey.
	// For other keys, keep registration conflicts visible to the caller.
	if key != 0x7B {
		if err := s.native.Register(accelerator, func() { r.trigger(time.Now()) }); err != nil {
			return err
		}
		r.nativeRegistered = true
	}
	if s.watchKeys != nil {
		stopWatching, err := s.watchKeys(key, func(state keyState) { r.observeEvent(state, time.Now()) })
		if err != nil {
			if r.nativeRegistered {
				if rollbackErr := s.native.Unregister(accelerator); rollbackErr != nil {
					return fmt.Errorf("start keyboard listener: %w; unregister hotkey: %v", err, rollbackErr)
				}
			}
			return fmt.Errorf("start keyboard listener: %w", err)
		}
		r.stopWatching = stopWatching
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
	if r.nativeRegistered {
		if err := s.native.Unregister(accelerator); err != nil {
			r.mu.Lock()
			r.active = true
			r.mu.Unlock()
			return err
		}
		r.nativeRegistered = false
	}
	if r.stopWatching != nil {
		if err := r.stopWatching(); err != nil {
			var restoreErr error
			if key, _ := functionKey(accelerator); key != 0x7B {
				restoreErr = s.native.Register(accelerator, func() { r.trigger(time.Now()) })
				r.nativeRegistered = restoreErr == nil
			}
			r.mu.Lock()
			r.active = true
			r.mu.Unlock()
			if restoreErr != nil {
				return fmt.Errorf("stop keyboard listener: %w; restore hotkey: %v", err, restoreErr)
			}
			return fmt.Errorf("stop keyboard listener: %w", err)
		}
	}
	close(r.stop)
	<-r.done
	delete(s.registrations, accelerator)
	return nil
}

func (r *registration) observe(state keyState, now time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// A zero GetAsyncKeyState result in a game must not release a hooked key.
	if r.eventDown {
		return
	}
	r.observeLocked(state, now)
}

func (r *registration) observeEvent(state keyState, now time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.eventDown = state.down
	r.observeLocked(state, now)
}

func (r *registration) observeLocked(state keyState, now time.Time) {
	rising := state.down && !r.down
	r.down = state.down
	if !state.down {
		r.fired = false
	}
	trigger := rising && state.matches
	if trigger {
		r.triggerLocked(now)
	}
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
