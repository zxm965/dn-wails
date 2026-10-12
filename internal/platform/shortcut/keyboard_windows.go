//go:build windows

package shortcut

import (
	"fmt"
	"log"
	"runtime"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	whKeyboardLL   = 13
	wmKeyDown      = 0x0100
	wmKeyUp        = 0x0101
	wmSysKeyDown   = 0x0104
	wmSysKeyUp     = 0x0105
	wmStopKeyboard = 0x8058
	llAltDown      = 0x20
)

var (
	keyboardUser32      = windows.NewLazySystemDLL("user32.dll")
	setWindowsHookEx    = keyboardUser32.NewProc("SetWindowsHookExW")
	unhookWindowsHookEx = keyboardUser32.NewProc("UnhookWindowsHookEx")
	callNextHookEx      = keyboardUser32.NewProc("CallNextHookEx")
	peekKeyboardMessage = keyboardUser32.NewProc("PeekMessageW")
	getKeyboardMessage  = keyboardUser32.NewProc("GetMessageW")
	postKeyboardMessage = keyboardUser32.NewProc("PostThreadMessageW")
	keyboardListeners   sync.Map
	// One permanent callback avoids leaking a Go callback slot on every key change.
	keyboardCallback = windows.NewCallback(handleKeyboardInput)
)

type keyboardInput struct {
	keyCode, scanCode, flags, timestamp uint32
	extraInfo                           uintptr
}

type keyboardMessage struct {
	window         uintptr
	message        uint32
	wParam, lParam uintptr
	timestamp      uint32
	x, y           int32
	private        uint32
}

type keyboardListener struct {
	tracker *keyTracker
	observe func(keyState)
}

func handleKeyboardInput(code int32, message uintptr, input *keyboardInput) uintptr {
	if code == 0 && input != nil {
		if value, ok := keyboardListeners.Load(windows.GetCurrentThreadId()); ok {
			listener := value.(*keyboardListener)
			if message == wmKeyDown || message == wmKeyUp || message == wmSysKeyDown || message == wmSysKeyUp {
				down := message == wmKeyDown || message == wmSysKeyDown
				if state, relevant := listener.tracker.observe(uintptr(input.keyCode), down, input.flags&llAltDown != 0); relevant {
					listener.observe(state)
				}
			}
		}
	}
	// Observe without swallowing input or blocking the game's own hook chain.
	result, _, _ := callNextHookEx.Call(0, uintptr(code), message, uintptr(unsafe.Pointer(input)))
	return result
}

func watchKeyboard(key uintptr, observe func(keyState)) (func() error, error) {
	type startup struct {
		thread uint32
		err    error
	}
	ready := make(chan startup, 1)
	done := make(chan struct{})
	stopped := make(chan error, 1)
	go func() {
		// A locked goroutine exiting destroys its OS thread, including on loop errors.
		runtime.LockOSThread()
		defer close(done)
		thread := windows.GetCurrentThreadId()
		var message keyboardMessage
		// Ensure PostThreadMessage can reach this thread before publishing ready.
		peekKeyboardMessage.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0, 0)
		var module windows.Handle
		if err := windows.GetModuleHandleEx(2, nil, &module); err != nil {
			ready <- startup{err: fmt.Errorf("get keyboard listener module: %w", err)}
			return
		}
		keyboardListeners.Store(thread, &keyboardListener{tracker: newKeyTracker(key, isDown), observe: observe})
		defer keyboardListeners.Delete(thread)
		hook, _, err := setWindowsHookEx.Call(whKeyboardLL, keyboardCallback, uintptr(module), 0)
		if hook == 0 {
			ready <- startup{err: fmt.Errorf("install low-level keyboard listener: %w", err)}
			return
		}
		defer func() {
			if hook != 0 {
				if ok, _, err := unhookWindowsHookEx.Call(hook); ok == 0 {
					log.Printf("release keyboard listener on thread exit: %v", err)
				}
			}
		}()
		ready <- startup{thread: thread}
		for {
			result, _, err := getKeyboardMessage.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0)
			if int32(result) <= 0 {
				if int32(result) < 0 {
					log.Printf("keyboard listener message loop failed: %v", err)
				}
				return
			}
			if message.message != wmStopKeyboard {
				continue
			}
			if ok, _, err := unhookWindowsHookEx.Call(hook); ok == 0 {
				stopped <- fmt.Errorf("uninstall keyboard listener: %w", err)
				continue
			}
			hook = 0
			stopped <- nil
			return
		}
	}()
	started := <-ready
	if started.err != nil {
		<-done
		return nil, started.err
	}
	log.Printf("global shortcut keyboard listener ready: key=F%d thread=%d", key-0x70+1, started.thread)
	return func() error {
		select {
		case <-done:
			return nil
		default:
		}
		if ok, _, err := postKeyboardMessage.Call(uintptr(started.thread), wmStopKeyboard, 0, 0); ok == 0 {
			select {
			case <-done:
				return nil
			default:
				return fmt.Errorf("stop keyboard listener thread: %w", err)
			}
		}
		select {
		case err := <-stopped:
			if err == nil {
				<-done
			}
			return err
		case <-done:
			return nil
		}
	}, nil
}
