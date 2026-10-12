//go:build windows

package shortcut

import "golang.org/x/sys/windows"

var getAsyncKeyState = windows.NewLazySystemDLL("user32.dll").NewProc("GetAsyncKeyState")

// New combines system registration with a dedicated low-level keyboard listener.
func New(native Native) Native {
	service := newFallback(native, readKeyState).(*fallbackService)
	service.watchKeys = watchKeyboard
	return service
}

func readKeyState(key uintptr) keyState {
	return readFunctionKeyState(key, isDown)
}

func isDown(key uintptr) bool {
	state, _, _ := getAsyncKeyState.Call(key)
	// The low bit is unreliable across processes; use only the current state.
	return state&0x8000 != 0
}
