//go:build darwin && cgo

package dnprocess

import (
	"errors"
	"testing"

	core "cull-pear/internal/dnprocess"
)

// Invalid input must fail before making any native call; never closes real applications.
func TestFirefoxRejectsInvalidNativeTargets(t *testing.T) {
	for _, target := range []core.Target{
		{PID: 0, Name: "firefox", Path: "/Applications/Firefox.app/Contents/MacOS/firefox"},
		{PID: 1, Name: "firefox", Path: "/Applications/Firefox.app/Contents/MacOS/firefox"},
		{PID: 1 << 31, Name: "firefox", Path: "/Applications/Firefox.app/Contents/MacOS/firefox"},
		{PID: 42, Name: "plugin-container", Path: "/Applications/Firefox.app/Contents/MacOS/plugin-container"},
		{PID: 42, Name: "firefox"},
	} {
		if err := (firefoxPlatform{}).Terminate(target); !errors.Is(err, core.ErrInvalidTarget) {
			t.Fatalf("invalid target accepted: %+v: %v", target, err)
		}
	}
}
