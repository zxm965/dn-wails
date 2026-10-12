package shortcut

import (
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

type nativeStub struct {
	callback      func()
	registerErr   error
	unregisterErr error
}

func (n *nativeStub) Register(_ string, callback func()) error {
	n.callback = callback
	return n.registerErr
}

func (n *nativeStub) Unregister(string) error { return n.unregisterErr }

func waitFor(t *testing.T, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("timed out waiting for shortcut state")
}

func waitIdle(t *testing.T, r *registration) {
	t.Helper()
	waitFor(t, func() bool {
		r.mu.Lock()
		defer r.mu.Unlock()
		return !r.running
	})
}

func TestFunctionKey(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct {
		input string
		key   uintptr
	}{
		{"F1", 0x70}, {"F4", 0x73}, {" f11 ", 0x7A},
		{"F12", 0x7B}, {"F0", 0}, {"F04", 0}, {"Ctrl+F4", 0}, {"Ctrl+Shift+F4", 0},
	} {
		t.Run(tc.input, func(t *testing.T) {
			key, err := functionKey(tc.input)
			if key != tc.key || (err != nil) != (tc.key == 0) {
				t.Fatalf("key=%#x err=%v", key, err)
			}
		})
	}
}

func TestSingleFunctionKeyRejectsModifiers(t *testing.T) {
	t.Parallel()
	for _, modifier := range []uintptr{0, 0x11, 0x10, 0x12, 0x5B, 0x5C} {
		state := readFunctionKeyState(0x7B, func(key uintptr) bool {
			return key == 0x7B || key == modifier
		})
		if !state.down || state.matches != (modifier == 0) {
			t.Fatalf("modifier=%#x state=%+v", modifier, state)
		}
	}
	if state := readFunctionKeyState(0x7B, func(uintptr) bool { return false }); state.down || state.matches {
		t.Fatalf("released key matched: %+v", state)
	}
}

func TestF12PollingSkipsNativeRegistrationAndStops(t *testing.T) {
	t.Parallel()
	failure := errors.New("F12 must not be registered or unregistered natively")
	native := &nativeStub{registerErr: failure, unregisterErr: failure}
	var down atomic.Bool
	var reads, count atomic.Int32
	service := newFallback(native, func(key uintptr) keyState {
		if key != 0x7B {
			panic("unexpected monitored key")
		}
		reads.Add(1)
		pressed := down.Load()
		return keyState{down: pressed, matches: pressed}
	}).(*fallbackService)
	if err := service.Register("F12", func() { count.Add(1) }); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if len(service.registrations) != 0 {
			_ = service.Unregister("F12")
		}
	})
	if native.callback != nil {
		t.Fatal("F12 was registered natively")
	}
	down.Store(true)
	waitFor(t, func() bool { return count.Load() == 1 })
	time.Sleep(2 * pollInterval)
	if count.Load() != 1 {
		t.Fatal("held F12 triggered repeatedly")
	}
	if err := service.Unregister("F12"); err != nil {
		t.Fatal(err)
	}
	readCount := reads.Load()
	time.Sleep(2 * pollInterval)
	if count.Load() != 1 || reads.Load() != readCount {
		t.Fatal("F12 monitoring remained active after unregister")
	}
}

func TestNativeAndPollingDispatchOncePerPress(t *testing.T) {
	t.Parallel()
	for _, nativeFirst := range []bool{true, false} {
		name := "poll-first"
		if nativeFirst {
			name = "native-first"
		}
		t.Run(name, func(t *testing.T) {
			var count atomic.Int32
			r := &registration{active: true, callback: func() { count.Add(1) }}
			now := time.Now()
			press := keyState{down: true, matches: true}
			if nativeFirst {
				r.trigger(now)
				r.observe(press, now)
			} else {
				r.observe(press, now)
				r.trigger(now)
			}
			waitIdle(t, r)
			// Auto-repeat and a long held key must not terminate more processes.
			r.observe(press, now.Add(time.Second))
			r.trigger(now.Add(time.Second))
			waitIdle(t, r)
			if count.Load() != 1 {
				t.Fatalf("duplicate activation: %d", count.Load())
			}
			r.observe(keyState{}, now.Add(2*time.Second))
			r.observe(press, now.Add(3*time.Second))
			waitIdle(t, r)
			if count.Load() != 2 {
				t.Fatalf("new press was not activated: %d", count.Load())
			}
		})
	}
}

func TestDelayedNativeMessageDoesNotDuplicateReleasedPress(t *testing.T) {
	t.Parallel()
	var count atomic.Int32
	r := &registration{active: true, callback: func() { count.Add(1) }}
	now := time.Now()
	r.observe(keyState{down: true, matches: true}, now)
	waitIdle(t, r)
	r.observe(keyState{}, now.Add(pollInterval))
	r.trigger(now.Add(2 * pollInterval))
	waitIdle(t, r)
	if count.Load() != 1 {
		t.Fatalf("queued native message duplicated the press: %d", count.Load())
	}
}

func TestPollingRejectsModifiersAndInitiallyHeldKey(t *testing.T) {
	t.Parallel()
	var count atomic.Int32
	r := &registration{active: true, down: true, fired: true, callback: func() { count.Add(1) }}
	now := time.Now()
	r.observe(keyState{down: true, matches: true}, now)
	r.trigger(now)
	r.observe(keyState{}, now)
	r.observe(keyState{down: true, matches: false}, now)
	// Releasing Ctrl while the function key is held is not a fresh press.
	r.observe(keyState{down: true, matches: true}, now)
	waitIdle(t, r)
	if count.Load() != 0 {
		t.Fatalf("unrequested activation: %d", count.Load())
	}
	r.observe(keyState{}, now)
	r.observe(keyState{down: true, matches: true}, now)
	waitIdle(t, r)
	if count.Load() != 1 {
		t.Fatal("single function key was not activated")
	}
}

func TestRunningCallbackCannotOverlap(t *testing.T) {
	t.Parallel()
	var count atomic.Int32
	release := make(chan struct{})
	r := &registration{active: true, callback: func() { count.Add(1); <-release }}
	now := time.Now()
	r.trigger(now)
	waitFor(t, func() bool { return count.Load() == 1 })
	r.observe(keyState{}, now)
	r.observe(keyState{down: true, matches: true}, now.Add(time.Second))
	r.trigger(now.Add(time.Second))
	close(release)
	waitIdle(t, r)
	if count.Load() != 1 {
		t.Fatal("callback was executed concurrently")
	}
}

func TestCallbackPanicReleasesExecutionGuard(t *testing.T) {
	t.Parallel()
	var count atomic.Int32
	r := &registration{active: true, callback: func() {
		if count.Add(1) == 1 {
			panic("failed callback")
		}
	}}
	now := time.Now()
	r.trigger(now)
	waitIdle(t, r)
	r.observe(keyState{}, now)
	r.observe(keyState{down: true, matches: true}, now.Add(time.Second))
	waitIdle(t, r)
	if count.Load() != 2 {
		t.Fatal("panic left execution guard active")
	}
}

func TestFallbackRunsWithoutNativeMessageAndStopsOnUnregister(t *testing.T) {
	t.Parallel()
	native := &nativeStub{}
	var down atomic.Bool
	var reads, count atomic.Int32
	service := newFallback(native, func(key uintptr) keyState {
		if key != 0x73 {
			panic("unexpected monitored key")
		}
		reads.Add(1)
		return keyState{down: down.Load(), matches: down.Load()}
	}).(*fallbackService)
	if err := service.Register("F4", func() { count.Add(1) }); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if len(service.registrations) != 0 {
			_ = service.Unregister("F4")
		}
	})
	down.Store(true)
	waitFor(t, func() bool { return count.Load() == 1 })
	if err := service.Unregister("F4"); err != nil {
		t.Fatal(err)
	}
	readCount := reads.Load()
	native.callback() // A callback queued before unregister must be ignored.
	time.Sleep(2 * pollInterval)
	if count.Load() != 1 || reads.Load() != readCount {
		t.Fatalf("unregistered shortcut remained active: callbacks=%d reads=%d", count.Load(), reads.Load())
	}
}

func TestRegistrationErrorsPreserveNativeSemantics(t *testing.T) {
	t.Parallel()
	failure := errors.New("native failure")
	native := &nativeStub{registerErr: failure}
	service := newFallback(native, func(uintptr) keyState { return keyState{} }).(*fallbackService)
	if err := service.Register("F4", func() {}); !errors.Is(err, failure) {
		t.Fatalf("registration conflict was hidden: %v", err)
	}
	if len(service.registrations) != 0 {
		t.Fatal("failed registration started monitoring")
	}
	native.registerErr = nil
	var count atomic.Int32
	if err := service.Register("F4", func() { count.Add(1) }); err != nil {
		t.Fatal(err)
	}
	native.unregisterErr = failure
	if err := service.Unregister("F4"); !errors.Is(err, failure) {
		t.Fatalf("unregister error was hidden: %v", err)
	}
	native.callback()
	waitFor(t, func() bool { return count.Load() == 1 })
	native.unregisterErr = nil
	if err := service.Unregister("F4"); err != nil {
		t.Fatal(err)
	}
}
