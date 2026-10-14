//go:build windows

package dnprocess

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"syscall"
	"testing"

	core "cull-pear/internal/dnprocess"
)

func TestLaunchRejectsInvalidTargets(t *testing.T) {
	t.Setenv("WINDIR", `C:\Windows`)
	for _, tc := range []struct {
		path string
		want error
	}{
		{"", core.ErrLaunchPathRequired},
		{`DragonNest.exe`, core.ErrInvalidTarget},
		{`C:\Games\other.exe`, core.ErrInvalidTarget},
		{`C:\Windows\DragonNest.exe`, core.ErrInvalidTarget},
		{filepath.Join(t.TempDir(), "DragonNest.exe"), core.ErrInvalidTarget},
		{filepath.Join(t.TempDir(), "DNLauncher.exe"), core.ErrLaunchNotFound},
	} {
		if err := (windowsPlatform{}).Launch(tc.path); !errors.Is(err, tc.want) {
			t.Errorf("launch %q: %v, want %v", tc.path, err, tc.want)
		}
	}
	directory := filepath.Join(t.TempDir(), "DNLauncher.exe")
	if err := os.Mkdir(directory, 0700); err != nil {
		t.Fatal(err)
	}
	if err := (windowsPlatform{}).Launch(directory); !errors.Is(err, core.ErrInvalidTarget) {
		t.Fatalf("launch accepted directory: %v", err)
	}
}

func TestManualLauncherPathMustBeLauncher(t *testing.T) {
	path := filepath.Join(t.TempDir(), "DNLauncher.exe")
	if err := os.WriteFile(path, []byte("fixture, never executed"), 0600); err != nil {
		t.Fatal(err)
	}
	actual, err := (windowsPlatform{}).ValidateLauncherPath(path)
	if err != nil || actual != path {
		t.Fatalf("manual launcher: %q %v", actual, err)
	}
	if _, err := (windowsPlatform{}).ValidateLauncherPath(filepath.Join(filepath.Dir(path), "DragonNest.exe")); !errors.Is(err, core.ErrInvalidTarget) {
		t.Fatalf("game executable accepted as manual launcher: %v", err)
	}
}

func TestTerminateTargetUsesOneHandleAndConfirmsExit(t *testing.T) {
	failure := errors.New("wait failed")
	for _, tc := range []struct {
		name                                             string
		path                                             string
		openErr, pathErr, terminateErr, waitErr, wantErr error
		wantCalls                                        []string
	}{
		{name: "exit confirmed", wantCalls: []string{"open", "path", "terminate", "wait", "close"}},
		{name: "access denied", openErr: core.ErrAccessDenied, wantErr: core.ErrAccessDenied, wantCalls: []string{"open"}},
		{name: "inspection denied", pathErr: core.ErrAccessDenied, wantErr: core.ErrAccessDenied, wantCalls: []string{"open", "path", "close"}},
		{name: "target changed", path: `D:\Other\DragonNest.exe`, wantErr: core.ErrTargetChanged, wantCalls: []string{"open", "path", "close"}},
		{name: "system target", path: `C:\Windows\DragonNest.exe`, wantErr: core.ErrInvalidTarget, wantCalls: []string{"open", "path", "close"}},
		{name: "termination denied", terminateErr: core.ErrAccessDenied, wantErr: core.ErrAccessDenied, wantCalls: []string{"open", "path", "terminate", "close"}},
		{name: "exit timeout", waitErr: core.ErrTerminationTimeout, wantErr: core.ErrTerminationTimeout, wantCalls: []string{"open", "path", "terminate", "wait", "close"}},
		{name: "wait failure", waitErr: failure, wantErr: failure, wantCalls: []string{"open", "path", "terminate", "wait", "close"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("WINDIR", `C:\Windows`)
			target := core.Target{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}
			path := target.Path
			if tc.path != "" {
				path = tc.path
			}
			if tc.name == "system target" {
				target.Path = path
			}
			var calls []string
			checkHandle := func(handle syscall.Handle, operation string) {
				t.Helper()
				if handle != 123 {
					t.Fatalf("%s used a different handle: %d", operation, handle)
				}
				calls = append(calls, operation)
			}
			err := terminateTarget(target, terminationAPI{
				open: func(pid uint32) (syscall.Handle, error) {
					if pid != target.PID {
						t.Fatalf("opened wrong PID: %d", pid)
					}
					calls = append(calls, "open")
					return 123, tc.openErr
				},
				path: func(handle syscall.Handle) (string, error) {
					checkHandle(handle, "path")
					return path, tc.pathErr
				},
				terminate: func(handle syscall.Handle) error {
					checkHandle(handle, "terminate")
					return tc.terminateErr
				},
				wait: func(handle syscall.Handle) error {
					checkHandle(handle, "wait")
					return tc.waitErr
				},
				close: func(handle syscall.Handle) { checkHandle(handle, "close") },
			})
			if !errors.Is(err, tc.wantErr) || !reflect.DeepEqual(calls, tc.wantCalls) {
				t.Fatalf("err=%v calls=%v; want err=%v calls=%v", err, calls, tc.wantErr, tc.wantCalls)
			}
		})
	}
}
