//go:build windows

package shortcut

import (
	"testing"
	"unsafe"
)

// Win32 ABI layouts must stay valid on both Windows architectures.
func TestRawInputABILayout(t *testing.T) {
	word := unsafe.Sizeof(uintptr(0))
	wantClass, wantMessage := uintptr(80), uintptr(48)
	if word == 4 {
		wantClass, wantMessage = 48, 32
	}
	for name, sizes := range map[string][2]uintptr{
		"WNDCLASSEX":     {unsafe.Sizeof(windowClass{}), wantClass},
		"MSG":            {unsafe.Sizeof(message{}), wantMessage},
		"RAWINPUTDEVICE": {unsafe.Sizeof(rawDevice{}), 8 + word},
		"RAWINPUTHEADER": {unsafe.Sizeof(rawHeader{}), 8 + 2*word},
		"RAWKEYBOARD":    {unsafe.Sizeof(rawKeyboard{}), 16},
	} {
		if sizes[0] != sizes[1] {
			t.Fatalf("%s size: got %d want %d", name, sizes[0], sizes[1])
		}
	}
}
