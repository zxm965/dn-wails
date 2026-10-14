//go:build darwin && cgo

package dnprocess

import (
	"context"
	"errors"
	"reflect"
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

func TestFirefoxRejectsInvalidLaunchApplications(t *testing.T) {
	for _, path := range []string{"firefox", "/Applications/Safari.app/Contents/MacOS/Safari", "/missing/Firefox.app/Contents/MacOS/firefox"} {
		if err := (firefoxPlatform{}).Launch(path); !errors.Is(err, core.ErrLaunchNotFound) {
			t.Fatalf("invalid launch accepted: %q: %v", path, err)
		}
	}
}

func TestFirefoxLaunchUsesNormalModeWithoutChangingProfile(t *testing.T) {
	// Inspect the command without starting Firefox or touching its profile.
	path := "/Applications/Firefox Test.app"
	command := firefoxLaunchCommand(context.Background(), path)
	want := []string{"/usr/bin/open", "-g", "-a", path, "--env", "MOZ_DISABLE_AUTO_SAFE_MODE=1"}
	if !reflect.DeepEqual(command.Args, want) {
		t.Fatalf("normal launch arguments: %v", command.Args)
	}
}
