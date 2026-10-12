package shortcut

import (
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestKeyTrackerFiltersModifiersAndOtherKeys(t *testing.T) {
	t.Parallel()
	for _, modifier := range modifierKeys {
		tracker := newKeyTracker(0x73, func(uintptr) bool { return false })
		if _, relevant := tracker.observe(0x41, true, false); relevant {
			t.Fatal("unrelated key was observed")
		}
		tracker.observe(modifier, true, false)
		if state, relevant := tracker.observe(0x73, true, false); !relevant || !state.down || state.matches {
			t.Fatalf("modifier %#x allowed a combined key: %+v", modifier, state)
		}
		tracker.observe(modifier, false, false)
		if state, relevant := tracker.observe(0x73, false, false); !relevant || state.down || state.matches {
			t.Fatalf("key release was not observed: %+v", state)
		}
		if state, _ := tracker.observe(0x73, true, false); !state.matches {
			t.Fatal("single key did not match after releasing modifier")
		}
	}
}

func TestKeyTrackerRetainsOtherSideModifierAndInitialState(t *testing.T) {
	t.Parallel()
	tracker := newKeyTracker(0x7B, func(key uintptr) bool { return key == 0xA2 })
	tracker.observe(0xA3, true, false)
	tracker.observe(0xA2, false, false)
	if state, _ := tracker.observe(0x7B, true, false); state.matches {
		t.Fatal("right Ctrl was lost when left Ctrl was released")
	}
	tracker.observe(0xA3, false, false)
	if state, _ := tracker.observe(0x7B, true, true); state.matches {
		t.Fatal("system Alt context was ignored")
	}
}

func TestEventListenerWorksWithoutAsyncKeyStateOrNativeMessage(t *testing.T) {
	t.Parallel()
	for _, accelerator := range []string{"F4", "F12"} {
		t.Run(accelerator, func(t *testing.T) {
			native := &nativeStub{}
			var count atomic.Int32
			var observed func(keyState)
			stopped := false
			service := newFallback(native, func(uintptr) keyState { return keyState{} }).(*fallbackService)
			service.watchKeys = func(key uintptr, observe func(keyState)) (func() error, error) {
				want, _ := functionKey(accelerator)
				if key != want {
					t.Fatalf("watching wrong key: %#x", key)
				}
				observed = observe
				return func() error { stopped = true; return nil }, nil
			}
			if err := service.Register(accelerator, func() { count.Add(1) }); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if len(service.registrations) != 0 {
					_ = service.Unregister(accelerator)
				}
			})
			r := service.registrations[accelerator]
			observed(keyState{down: true, matches: true})
			waitIdle(t, r)
			// The background sampler sees only zero while the hooked key is held.
			time.Sleep(2 * pollInterval)
			observed(keyState{down: true, matches: true})
			if native.callback != nil {
				native.callback()
			}
			waitIdle(t, r)
			if count.Load() != 1 {
				t.Fatalf("held key or native message duplicated activation: %d", count.Load())
			}
			observed(keyState{})
			// Advance the duplicate guard without waiting for a physical keyboard.
			r.mu.Lock()
			r.lastTrigger = time.Now().Add(-time.Second)
			r.mu.Unlock()
			observed(keyState{down: true, matches: true})
			waitIdle(t, r)
			if count.Load() != 2 {
				t.Fatal("fresh hook press did not activate")
			}
			if err := service.Unregister(accelerator); err != nil || !stopped {
				t.Fatalf("listener cleanup failed: stopped=%v err=%v", stopped, err)
			}
			observed(keyState{})
			observed(keyState{down: true, matches: true})
			waitIdle(t, r)
			if count.Load() != 2 {
				t.Fatal("queued event fired after listener stopped")
			}
		})
	}
}

func TestEventListenerLifecycleErrorsPreserveRegistration(t *testing.T) {
	t.Parallel()
	failure := errors.New("listener failure")
	native := &nativeStub{}
	service := newFallback(native, func(uintptr) keyState { return keyState{} }).(*fallbackService)
	service.watchKeys = func(uintptr, func(keyState)) (func() error, error) { return nil, failure }
	if err := service.Register("F4", func() {}); !errors.Is(err, failure) || len(service.registrations) != 0 {
		t.Fatalf("listener start failure was not returned: %v", err)
	}
	var count atomic.Int32
	var observed func(keyState)
	stopErr := failure
	service.watchKeys = func(_ uintptr, observe func(keyState)) (func() error, error) {
		observed = observe
		return func() error { return stopErr }, nil
	}
	if err := service.Register("F4", func() { count.Add(1) }); err != nil {
		t.Fatal(err)
	}
	r := service.registrations["F4"]
	t.Cleanup(func() { stopErr = nil; _ = service.Unregister("F4") })
	if err := service.Unregister("F4"); !errors.Is(err, failure) {
		t.Fatalf("listener stop failure was hidden: %v", err)
	}
	observed(keyState{down: true, matches: true})
	waitIdle(t, r)
	if count.Load() != 1 || !r.nativeRegistered {
		t.Fatal("failed cleanup did not restore active registration")
	}
	stopErr = nil
	if err := service.Unregister("F4"); err != nil {
		t.Fatal(err)
	}
}
