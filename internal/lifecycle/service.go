package lifecycle

import (
	"sync"
	"time"
)

type Status struct {
	StartedAt           time.Time
	Ready               bool
	SecondInstanceCount int
}

// Service tracks process lifecycle state independently from Wails callbacks.
type Service struct {
	mu     sync.RWMutex
	status Status
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Start(startedAt time.Time) {
	s.mu.Lock()
	s.status = Status{StartedAt: startedAt}
	s.mu.Unlock()
}

func (s *Service) MarkReady() {
	s.mu.Lock()
	s.status.Ready = true
	s.mu.Unlock()
}

func (s *Service) RecordSecondInstance() {
	s.mu.Lock()
	s.status.SecondInstanceCount++
	s.mu.Unlock()
}

func (s *Service) Stop() {
	s.mu.Lock()
	s.status.Ready = false
	s.mu.Unlock()
}

func (s *Service) Status() Status {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.status
}
