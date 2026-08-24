//go:build windows

package dnprocess

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	core "cull-pear/internal/dnprocess"
)

const (
	th32csSnapProcess              = 0x00000002
	processQueryLimitedInformation = 0x1000
	processTerminate               = 0x0001
	maxProcessPath                 = 32768
	maxProcessName                 = 260
	errorInvalidParameter          = syscall.Errno(87)
)

var (
	kernel32                   = syscall.NewLazyDLL("kernel32.dll")
	createToolhelp32Snapshot   = kernel32.NewProc("CreateToolhelp32Snapshot")
	process32FirstW            = kernel32.NewProc("Process32FirstW")
	process32NextW             = kernel32.NewProc("Process32NextW")
	openProcess                = kernel32.NewProc("OpenProcess")
	queryFullProcessImageNameW = kernel32.NewProc("QueryFullProcessImageNameW")
	terminateProcess           = kernel32.NewProc("TerminateProcess")
	closeHandle                = kernel32.NewProc("CloseHandle")
)

type processEntry32 struct {
	Size            uint32
	Usage           uint32
	ProcessID       uint32
	DefaultHeapID   uintptr
	ModuleID        uint32
	Threads         uint32
	ParentProcessID uint32
	PriClassBase    int32
	Flags           uint32
	ExeFile         [maxProcessName]uint16
}

type windowsPlatform struct{}

func New() core.Service {
	return core.NewService(windowsPlatform{})
}

func (windowsPlatform) List() ([]core.Info, error) {
	handle, _, callErr := createToolhelp32Snapshot.Call(th32csSnapProcess, 0)
	if handle == uintptr(syscall.InvalidHandle) {
		return nil, fmt.Errorf("create process snapshot: %w", callErr)
	}
	defer closeProcessHandle(syscall.Handle(handle))

	entry := processEntry32{Size: uint32(unsafe.Sizeof(processEntry32{}))}
	if ok, _, err := process32FirstW.Call(handle, uintptr(unsafe.Pointer(&entry))); ok == 0 {
		if err == syscall.ERROR_NO_MORE_FILES {
			return []core.Info{}, nil
		}
		return nil, fmt.Errorf("read first process snapshot entry: %w", err)
	}

	items := make([]core.Info, 0)
	for {
		name := syscall.UTF16ToString(entry.ExeFile[:])
		path, err := processPath(entry.ProcessID)
		if err == nil && !isSystemProcess(name, path) {
			items = append(items, core.Info{PID: entry.ProcessID, Name: name, Path: path})
		}

		if ok, _, err := process32NextW.Call(handle, uintptr(unsafe.Pointer(&entry))); ok == 0 {
			if err == syscall.ERROR_NO_MORE_FILES {
				break
			}
			return nil, fmt.Errorf("read next process snapshot entry: %w", err)
		}
	}
	return items, nil
}

func (windowsPlatform) Terminate(target core.Target) error {
	name, path, err := inspectProcess(target.PID)
	if err != nil {
		return err
	}
	if !strings.EqualFold(name, target.Name) || !sameWindowsPath(path, target.Path) {
		return fmt.Errorf("%w: pid %d no longer matches the scanned target", core.ErrTargetChanged, target.PID)
	}
	if isSystemProcess(name, path) {
		return fmt.Errorf("%w: system process %q cannot be terminated by this tool", core.ErrInvalidTarget, name)
	}

	handle, _, callErr := openProcess.Call(processTerminate, 0, uintptr(target.PID))
	if handle == 0 {
		return mapProcessError("open process for termination", callErr)
	}
	defer closeProcessHandle(syscall.Handle(handle))
	if result, _, callErr := terminateProcess.Call(handle, 1); result == 0 {
		return mapProcessError("terminate process", callErr)
	}
	return nil
}

func processPath(pid uint32) (string, error) {
	handle, _, callErr := openProcess.Call(processQueryLimitedInformation, 0, uintptr(pid))
	if handle == 0 {
		return "", mapProcessError("open process for inspection", callErr)
	}
	defer closeProcessHandle(syscall.Handle(handle))

	buffer := make([]uint16, maxProcessPath)
	length := uint32(len(buffer))
	if result, _, callErr := queryFullProcessImageNameW.Call(
		handle,
		0,
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(unsafe.Pointer(&length)),
	); result == 0 {
		return "", mapProcessError("query process path", callErr)
	}
	return syscall.UTF16ToString(buffer[:length]), nil
}

func inspectProcess(pid uint32) (string, string, error) {
	path, err := processPath(pid)
	if err != nil {
		if errors.Is(err, core.ErrAccessDenied) {
			return "", "", err
		}
		return "", "", fmt.Errorf("%w: pid %d", core.ErrNotFound, pid)
	}
	return filepath.Base(path), path, nil
}

func closeProcessHandle(handle syscall.Handle) {
	if handle != 0 && handle != syscall.Handle(syscall.InvalidHandle) {
		_, _, _ = closeHandle.Call(uintptr(handle))
	}
}

func mapProcessError(operation string, callErr error) error {
	if callErr == syscall.ERROR_ACCESS_DENIED {
		return fmt.Errorf("%w: %s", core.ErrAccessDenied, operation)
	}
	if callErr == errorInvalidParameter {
		return fmt.Errorf("%w: %s", core.ErrNotFound, operation)
	}
	return fmt.Errorf("%s: %w", operation, callErr)
}

func isSystemProcess(name string, path string) bool {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "system", "registry", "secure system", "memory compression", "idle", "smss.exe", "csrss.exe", "wininit.exe", "services.exe", "lsass.exe", "winlogon.exe", "svchost.exe", "dwm.exe", "fontdrvhost.exe":
		return true
	}
	lowerPath := strings.ToLower(filepath.Clean(path))
	windowsRoot := strings.ToLower(filepath.Clean(`C:\Windows`))
	if root := strings.TrimSpace(os.Getenv("WINDIR")); root != "" {
		windowsRoot = strings.ToLower(filepath.Clean(root))
	}
	return lowerPath == windowsRoot || strings.HasPrefix(lowerPath, windowsRoot+`\`)
}

func sameWindowsPath(left string, right string) bool {
	return strings.EqualFold(filepath.Clean(left), filepath.Clean(right))
}
