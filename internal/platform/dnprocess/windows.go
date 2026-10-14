//go:build windows

package dnprocess

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	core "cull-pear/internal/dnprocess"
	"golang.org/x/sys/windows"
)

const (
	th32csSnapProcess              = 0x00000002
	processQueryLimitedInformation = 0x1000
	processTerminate               = 0x0001
	processSynchronize             = 0x00100000
	terminationTimeoutMS           = 3000
	waitObject0                    = 0
	waitTimeout                    = 258
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
	waitForSingleObject        = kernel32.NewProc("WaitForSingleObject")
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

func (windowsPlatform) Launch(path string) error {
	launcher, err := resolveLauncherPath(path)
	if err != nil {
		return err
	}
	items, err := (windowsPlatform{}).List()
	if err != nil {
		return err
	}
	for _, item := range items {
		if sameWindowsPath(item.Path, launcher) {
			return nil
		}
	}
	file, err := windows.UTF16PtrFromString(launcher)
	if err != nil {
		return core.ErrInvalidTarget
	}
	directory, err := windows.UTF16PtrFromString(filepath.Dir(launcher))
	if err != nil {
		return core.ErrInvalidTarget
	}
	// Use the normal Windows open action so launchers with an elevation manifest can show UAC.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	if err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED|windows.COINIT_DISABLE_OLE1DDE); err == nil || errors.Is(err, syscall.Errno(1)) {
		// S_FALSE also increments COM's initialization count and requires a matching uninitialize.
		defer windows.CoUninitialize()
	} else if !errors.Is(err, syscall.Errno(windows.RPC_E_CHANGED_MODE)) {
		return fmt.Errorf("initialize launcher COM: %w", err)
	}
	if err := windows.ShellExecute(0, nil, file, nil, directory, windows.SW_SHOWNORMAL); err != nil {
		return fmt.Errorf("open Dragon Nest launcher: %w", err)
	}
	return nil
}

func resolveLauncherPath(path string) (string, error) {
	if path == "" {
		return "", core.ErrLaunchPathRequired
	}
	name := strings.ToLower(filepath.Base(path))
	if !filepath.IsAbs(path) || name != "dnlauncher.exe" || isSystemProcess(name, path) {
		return "", core.ErrInvalidTarget
	}

	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", core.ErrLaunchNotFound
	}
	if err != nil {
		return "", fmt.Errorf("inspect launch application: %w", err)
	}
	if !info.Mode().IsRegular() {
		return "", core.ErrInvalidTarget
	}
	return path, nil
}

func (windowsPlatform) ValidateLauncherPath(path string) (string, error) {
	if !strings.EqualFold(filepath.Base(path), "DNLauncher.exe") {
		return "", core.ErrInvalidTarget
	}
	return resolveLauncherPath(filepath.Clean(path))
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
		} else if errors.Is(err, core.ErrAccessDenied) && !isSystemProcess(name, "") {
			// Let the domain report an inaccessible game instead of claiming it is absent.
			items = append(items, core.Info{PID: entry.ProcessID, Name: name})
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
	return terminateTarget(target, terminationAPI{
		open: func(pid uint32) (syscall.Handle, error) {
			handle, _, err := openProcess.Call(processTerminate|processQueryLimitedInformation|processSynchronize, 0, uintptr(pid))
			if handle == 0 {
				return 0, mapProcessError("open process for termination", err)
			}
			return syscall.Handle(handle), nil
		},
		path: processPathFromHandle,
		terminate: func(handle syscall.Handle) error {
			if result, _, err := terminateProcess.Call(uintptr(handle), 1); result == 0 {
				return mapProcessError("terminate process", err)
			}
			return nil
		},
		wait: func(handle syscall.Handle) error {
			result, _, err := waitForSingleObject.Call(uintptr(handle), terminationTimeoutMS)
			switch result {
			case waitObject0:
				return nil
			case waitTimeout:
				return fmt.Errorf("%w: process did not exit within %dms", core.ErrTerminationTimeout, terminationTimeoutMS)
			default:
				return fmt.Errorf("wait for process termination: result %#x: %w", result, err)
			}
		},
		close: closeProcessHandle,
	})
}

// All operations use one handle so PID reuse cannot change the process being killed.
type terminationAPI struct {
	open      func(uint32) (syscall.Handle, error)
	path      func(syscall.Handle) (string, error)
	terminate func(syscall.Handle) error
	wait      func(syscall.Handle) error
	close     func(syscall.Handle)
}

func terminateTarget(target core.Target, api terminationAPI) error {
	handle, err := api.open(target.PID)
	if err != nil {
		return err
	}
	defer api.close(handle)
	path, err := api.path(handle)
	if err != nil {
		return err
	}
	name := filepath.Base(path)
	if !strings.EqualFold(name, target.Name) || !sameWindowsPath(path, target.Path) {
		return fmt.Errorf("%w: pid %d no longer matches the scanned target", core.ErrTargetChanged, target.PID)
	}
	if isSystemProcess(name, path) {
		return fmt.Errorf("%w: system process %q cannot be terminated by this tool", core.ErrInvalidTarget, name)
	}

	if err := api.terminate(handle); err != nil {
		return err
	}
	return api.wait(handle)
}

func processPath(pid uint32) (string, error) {
	handle, _, callErr := openProcess.Call(processQueryLimitedInformation, 0, uintptr(pid))
	if handle == 0 {
		return "", mapProcessError("open process for inspection", callErr)
	}
	defer closeProcessHandle(syscall.Handle(handle))
	return processPathFromHandle(syscall.Handle(handle))
}

func processPathFromHandle(handle syscall.Handle) (string, error) {
	buffer := make([]uint16, maxProcessPath)
	length := uint32(len(buffer))
	if result, _, callErr := queryFullProcessImageNameW.Call(
		uintptr(handle),
		0,
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(unsafe.Pointer(&length)),
	); result == 0 {
		return "", mapProcessError("query process path", callErr)
	}
	return syscall.UTF16ToString(buffer[:length]), nil
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
