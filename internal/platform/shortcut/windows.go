//go:build windows

package shortcut

import "golang.org/x/sys/windows"

var getAsyncKeyState = windows.NewLazySystemDLL("user32.dll").NewProc("GetAsyncKeyState")

// New retains the native hotkey and observes only its configured combination
// independently of the WebView and foreground window's message handling.
func New(native Native) Native {
	return newFallback(native, readKeyState)
}

func readKeyState(key uintptr) keyState {
	down := isDown(key)
	return keyState{
		down: down,
		matches: down && isDown(0x11) && !isDown(0x10) && !isDown(0x12) &&
			!isDown(0x5B) && !isDown(0x5C),
	}
}

func isDown(key uintptr) bool {
	state, _, _ := getAsyncKeyState.Call(key)
	// The low bit is unreliable across processes; use only the current state.
	return state&0x8000 != 0
}
