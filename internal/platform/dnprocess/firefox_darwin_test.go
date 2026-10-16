//go:build darwin && cgo

package dnprocess

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
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
	if err := (firefoxPlatform{}).Launch(""); !errors.Is(err, core.ErrLaunchPathRequired) {
		t.Fatalf("missing launch path: %v", err)
	}
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

func TestFirefoxLauncherConfiguration(t *testing.T) {
	for _, tc := range []struct {
		name, bundleID, executable string
		mode                       os.FileMode
		valid                      bool
	}{
		{"valid Firefox", "org.mozilla.firefox", "firefox", 0700, true},
		{"different application", "org.example.other", "firefox", 0700, false},
		{"helper executable", "org.mozilla.firefox", "plugin-container", 0700, false},
		{"not executable", "org.mozilla.firefox", "firefox", 0600, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Temporary bundles validate identity and paths without launching any application.
			bundle := filepath.Join(t.TempDir(), "Firefox Test.app")
			executable := filepath.Join(bundle, "Contents", "MacOS", tc.executable)
			if err := os.MkdirAll(filepath.Dir(executable), 0700); err != nil {
				t.Fatal(err)
			}
			plist := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>%s</string><key>CFBundleExecutable</key><string>%s</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>`, tc.bundleID, tc.executable)
			if err := os.WriteFile(filepath.Join(bundle, "Contents", "Info.plist"), []byte(plist), 0600); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(executable, []byte("#!/bin/sh\nexit 0\n"), tc.mode); err != nil {
				t.Fatal(err)
			}
			for _, input := range []string{bundle, executable} {
				got, err := (firefoxPlatform{}).ValidateLauncherPath(input)
				if tc.valid {
					if err != nil || got != executable {
						t.Fatalf("validate %q: %q %v", input, got, err)
					}
				} else if !errors.Is(err, core.ErrInvalidTarget) {
					t.Fatalf("invalid bundle accepted: %q %v", input, err)
				}
			}
		})
	}
	for _, input := range []string{"", "Firefox.app", "firefox"} {
		if _, err := (firefoxPlatform{}).ValidateLauncherPath(input); !errors.Is(err, core.ErrInvalidTarget) {
			t.Fatalf("relative path accepted: %q %v", input, err)
		}
	}
	if _, err := (firefoxPlatform{}).ValidateLauncherPath(filepath.Join(t.TempDir(), "Missing.app")); !errors.Is(err, core.ErrLaunchNotFound) {
		t.Fatalf("missing app: %v", err)
	}
}
