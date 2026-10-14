//go:build darwin && cgo

package dnprocess

/*
#cgo LDFLAGS: -framework AppKit
#include <stdlib.h>
char *firefox_processes(void);
int firefox_terminate(int pid, const char *path, void **handle);
int firefox_exited(void *handle);
void firefox_release(void *handle);
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"time"
	"unsafe"

	core "cull-pear/internal/dnprocess"
)

type firefoxPlatform struct{}

func New() core.Service {
	return core.NewFirefoxTestService(firefoxPlatform{})
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
