package shortcut

import (
	"log"
	"sync"
	"time"

	"cull-pear/internal/dnprocess"
)

// Native starts exactly one input channel. The platform owns application-exit cleanup.
type Native interface {
	Start(key string, gameMode bool, fire func(), failed func(error)) (stop func() error, err error)
}

type Status struct {
	Revision          uint64         `json:"revision"`
	Enabled           bool           `json:"enabled"`
	Key               string         `json:"key"`
	GameMode          bool           `json:"gameMode"`
	Registered        bool           `json:"registered"`
	RegistrationError string         `json:"registrationError"`
	TriggerCount      uint64         `json:"triggerCount"`
	LastTriggeredAt   string         `json:"lastTriggeredAt"`
	Running           bool           `json:"running"`
	LastError         string         `json:"lastError"`
	LastProcess       dnprocess.Info `json:"lastProcess"`
}

type Service struct {
	configMu sync.Mutex
	mu       sync.Mutex
	native   Native
	execute  func() (dnprocess.Info, error)
	changed  func(Status)
	status   Status
	stop     func() error
	epoch    uint64
	closed   bool
}

func New(native Native, execute func() (dnprocess.Info, error), changed func(Status)) *Service {
	return &Service{native: native, execute: execute, changed: changed}
}

func (s *Service) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.status
}

// Configure is called only after the runtime is ready, so success means the OS
// accepted registration rather than Wails merely queueing a startup request.
func (s *Service) Configure(enabled bool, key string, gameMode bool) {
	s.configMu.Lock()
	defer s.configMu.Unlock()
	s.mu.Lock()
	if s.closed || (s.status.Enabled == enabled && s.status.Key == key &&
		s.status.GameMode == gameMode && s.status.RegistrationError == "" &&
		(!enabled || s.status.Registered)) {
		s.mu.Unlock()
		return
	}
	s.epoch++
	epoch := s.epoch
	s.status.Enabled, s.status.Key, s.status.GameMode = enabled, key, gameMode
	s.status.Registered, s.status.RegistrationError = false, ""
	s.mu.Unlock()
	if s.stop != nil {
		err := s.stop()
		if err != nil {
			s.failed(epoch, err)
			return
		}
		s.stop = nil
	}
	if !enabled {
		s.publish()
		return
	}
	if s.native == nil {
		s.failed(epoch, dnprocess.ErrUnavailable)
		return
	}
	stop, err := s.native.Start(key, gameMode, func() { s.fire(epoch) }, func(err error) { s.failed(epoch, err) })
	if err != nil {
		s.failed(epoch, err)
		return
	}
	s.stop = stop
	s.mu.Lock()
	if !s.closed && s.epoch == epoch && s.status.RegistrationError == "" {
		s.status.Registered = true
	}
	s.mu.Unlock()
	log.Printf("shortcut: configured key=%s gameMode=%t", key, gameMode)
	s.publish()
}

func (s *Service) failed(epoch uint64, err error) {
	s.mu.Lock()
	if s.closed || s.epoch != epoch {
		s.mu.Unlock()
		return
	}
	s.status.Registered = false
	s.status.RegistrationError = err.Error()
	s.mu.Unlock()
	log.Printf("shortcut: input channel failed: %v", err)
	s.publish()
}

func (s *Service) fire(epoch uint64) {
	s.mu.Lock()
	if s.closed || s.epoch != epoch || !s.status.Registered || s.status.Running {
		s.mu.Unlock()
		return
	}
	s.status.TriggerCount++
	s.status.LastTriggeredAt = time.Now().UTC().Format(time.RFC3339Nano)
	s.status.Running, s.status.LastError = true, ""
	s.status.LastProcess = dnprocess.Info{}
	key, gameMode := s.status.Key, s.status.GameMode
	s.mu.Unlock()
	log.Printf("shortcut: received key=%s gameMode=%t", key, gameMode)
	s.publish()
	info, err := s.execute()
	s.mu.Lock()
	s.status.Running = false
	s.status.LastProcess = info
	if err != nil {
		s.status.LastError = err.Error()
	}
	s.mu.Unlock()
	log.Printf("shortcut: completed pid=%d error=%v", info.PID, err)
	s.publish()
}

func (s *Service) publish() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.status.Revision++
	status := s.status
	s.mu.Unlock()
	if s.changed != nil {
		s.changed(status)
	}
}

// Shutdown invalidates queued callbacks without waiting for the UI thread.
// Wails releases its hotkeys; the raw-input thread observes application context cancellation.
func (s *Service) Shutdown() {
	s.mu.Lock()
	s.closed = true
	s.epoch++
	s.mu.Unlock()
}
