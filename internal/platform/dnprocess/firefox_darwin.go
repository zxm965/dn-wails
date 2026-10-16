//go:build darwin && cgo

package dnprocess

/*
#cgo LDFLAGS: -framework AppKit
#include <stdlib.h>
char *firefox_processes(void);
int firefox_terminate(int pid, const char *path, void **handle);
int firefox_exited(void *handle);
void firefox_release(void *handle);
char *firefox_executable_path(const char *executable);
*/
import "C"

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
	"unsafe"

	core "cull-pear/internal/dnprocess"
)

type firefoxPlatform struct{}

func (firefoxPlatform) ValidateLauncherPath(path string) (string, error) {
	if !filepath.IsAbs(path) {
		return "", core.ErrInvalidTarget
	}
	path = filepath.Clean(path)
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return "", core.ErrLaunchNotFound
	} else if err != nil {
		return "", fmt.Errorf("inspect Firefox application: %w", err)
	}
	executable := resolveFirefoxExecutable(path)
	if executable == "" {
		return "", core.ErrInvalidTarget
	}
	return executable, nil
}

func New() core.Service {
	return core.NewFirefoxTestService(firefoxPlatform{})
}

func (firefoxPlatform) Launch(path string) error {
	if path == "" {
		return core.ErrLaunchPathRequired
	}
	executable := resolveFirefoxExecutable(path)
	if executable == "" {
		return core.ErrLaunchNotFound
	}
	application := filepath.Dir(filepath.Dir(filepath.Dir(executable)))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Launch through Launch Services without stealing the process window's focus.
	if output, err := firefoxLaunchCommand(ctx, application).CombinedOutput(); err != nil {
		return fmt.Errorf("launch Firefox: %w: %s", err, output)
	}
	return nil
}

func resolveFirefoxExecutable(path string) string {
	input := C.CString(path)
	defer C.free(unsafe.Pointer(input))
	executable := C.firefox_executable_path(input)
	if executable == nil {
		return ""
	}
	defer C.free(unsafe.Pointer(executable))
	return C.GoString(executable)
}

func firefoxLaunchCommand(ctx context.Context, application string) *exec.Cmd {
	// Pass this only to the launched Firefox, not the user's profile or global environment.
	// Firefox otherwise offers Troubleshoot Mode after repeated forced exits during startup.
	return exec.CommandContext(ctx, "/usr/bin/open", "-g", "-a", application,
		"--env", "MOZ_DISABLE_AUTO_SAFE_MODE=1")
}

func (firefoxPlatform) List() ([]core.Info, error) {
	data := C.firefox_processes()
	if data == nil {
		return nil, fmt.Errorf("read Firefox applications: could not encode application list")
	}
	defer C.free(unsafe.Pointer(data))
	var items []core.Info
	if err := json.Unmarshal([]byte(C.GoString(data)), &items); err != nil {
		return nil, fmt.Errorf("decode Firefox applications: %w", err)
	}
	return items, nil
}

func (firefoxPlatform) Terminate(target core.Target) error {
	if target.PID <= 1 || target.PID > 1<<31-1 || target.Name != "firefox" || target.Path == "" {
		return core.ErrInvalidTarget
	}
	path := C.CString(target.Path)
	defer C.free(unsafe.Pointer(path))
	var handle unsafe.Pointer
	switch C.firefox_terminate(C.int(target.PID), path, &handle) {
	case 0:
	case 1:
		return core.ErrNotFound
	case 2:
		return core.ErrTargetChanged
	default:
		return core.ErrAccessDenied
	}
	defer C.firefox_release(handle)
	// AppKit updates the retained application's state as the main run loop runs.
	// Poll from this worker so the UI thread remains available to deliver those updates.
	deadline := time.Now().Add(3 * time.Second)
	for {
		if C.firefox_exited(handle) != 0 {
			return nil
		}
		if time.Now().After(deadline) {
			return core.ErrTerminationTimeout
		}
		time.Sleep(25 * time.Millisecond)
	}
}
