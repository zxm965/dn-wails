package shortcut

import (
	"errors"
	"sync"
	"testing"

	"cull-pear/internal/dnprocess"
)

type nativeStub struct {
	callbacks []func()
	failures  []func(error)
	startErr  error
	stopErr   error
	stops     int
	mode      bool
}

func (n *nativeStub) Start(_ string, mode bool, fire func(), failed func(error)) (func() error, error) {
	if n.startErr != nil {
		return nil, n.startErr
	}
	n.mode = mode
	n.callbacks = append(n.callbacks, fire)
	n.failures = append(n.failures, failed)
	return func() error { n.stops++; return n.stopErr }, nil
}

func TestRegistrationLifecycle(t *testing.T) {
	n := &nativeStub{}
	calls := 0
	s := New(n, func() (dnprocess.Info, error) { calls++; return dnprocess.Info{PID: 42}, nil }, nil)
	s.Configure(false, "F4", false)
	if len(n.callbacks) != 0 {
		t.Fatal("disabled shortcut registered")
	}
	s.Configure(true, "F4", false)
	s.Configure(true, "F4", false)
	if len(n.callbacks) != 1 || !s.Status().Registered {
		t.Fatal("registration not idempotent")
	}
	n.callbacks[0]()
	if calls != 1 || s.Status().TriggerCount != 1 || s.Status().LastProcess.PID != 42 {
		t.Fatal(s.Status())
	}
	s.Configure(true, "Ctrl+Shift+F4", true)
	n.callbacks[0]() // Callback queued before a mode/key switch must not act.
	n.failures[0](errors.New("stale failure"))
	n.callbacks[1]()
	if calls != 2 || !n.mode || n.stops != 1 || s.Status().RegistrationError != "" {
		t.Fatal(s.Status())
	}
	s.Configure(false, "Ctrl+Shift+F4", true)
	n.callbacks[1]()
	if calls != 2 || s.Status().Registered || n.stops != 2 {
		t.Fatal(s.Status())
	}
	s.Shutdown()
	s.Configure(true, "F4", false)
	if len(n.callbacks) != 2 {
		t.Fatal("registered after shutdown")
	}
}

func TestFailuresAndRetry(t *testing.T) {
	n := &nativeStub{startErr: errors.New("already registered")}
	s := New(n, func() (dnprocess.Info, error) { return dnprocess.Info{}, dnprocess.ErrAccessDenied }, nil)
	s.Configure(true, "F4", false)
	if s.Status().Registered || s.Status().RegistrationError == "" {
		t.Fatal(s.Status())
	}
	n.startErr = nil
	s.Configure(true, "F4", false)
	n.callbacks[0]()
	status := s.Status()
	if !status.Registered || status.RegistrationError != "" || status.LastError != dnprocess.ErrAccessDenied.Error() ||
		status.TriggerCount != 1 || status.LastTriggeredAt == "" || status.Running {
		t.Fatal(status)
	}
	n.failures[0](errors.New("input loop stopped"))
	n.callbacks[0]()
	if s.Status().Registered || s.Status().TriggerCount != 1 {
		t.Fatal(s.Status())
	}
	s.Configure(true, "F4", false)
	if !s.Status().Registered || n.stops != 1 {
		t.Fatal(s.Status())
	}
	n.stopErr = errors.New("stop failed")
	s.Configure(true, "F5", false)
	if s.Status().Registered || len(n.callbacks) != 2 {
		t.Fatal("started despite old channel cleanup failure")
	}
	n.stopErr = nil
	s.Configure(true, "F5", false)
	if !s.Status().Registered || len(n.callbacks) != 3 {
		t.Fatal("cleanup not retried")
	}
}

func TestConcurrentTriggersAreCoalescedAndResultRetained(t *testing.T) {
	n := &nativeStub{}
	started, release := make(chan struct{}), make(chan struct{})
	s := New(n, func() (dnprocess.Info, error) {
		close(started)
		<-release
		return dnprocess.Info{}, dnprocess.ErrTerminationTimeout
	}, nil)
	s.Configure(true, "F4", false)
	done := make(chan struct{})
	go func() { n.callbacks[0](); close(done) }()
	<-started
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Go(n.callbacks[0])
	}
	wg.Wait()
	if !s.Status().Running || s.Status().TriggerCount != 1 {
		t.Fatal(s.Status())
	}
	s.Configure(false, "F4", false)
	close(release)
	<-done
	if s.Status().Running || s.Status().LastError != dnprocess.ErrTerminationTimeout.Error() {
		t.Fatal(s.Status())
	}
}

func TestShutdownInvalidatesQueuedCallback(t *testing.T) {
	n := &nativeStub{}
	s := New(n, func() (dnprocess.Info, error) { t.Fatal("executed after shutdown"); return dnprocess.Info{}, nil }, nil)
	s.Configure(true, "F4", false)
	s.Shutdown()
	n.callbacks[0]()
}
