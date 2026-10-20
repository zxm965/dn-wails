//go:build windows

package shortcut

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	wmInput        = 0x00FF
	wmDevice       = 0x00FE
	wmStop         = 0x8001
	ridInput       = 0x10000003
	ridevRemove    = 0x00000001
	ridevInputSink = 0x00000100
	ridevNotify    = 0x00002000
)

var (
	user32             = windows.NewLazySystemDLL("user32.dll")
	registerClass      = user32.NewProc("RegisterClassExW")
	createWindow       = user32.NewProc("CreateWindowExW")
	destroyWindow      = user32.NewProc("DestroyWindow")
	defWindowProc      = user32.NewProc("DefWindowProcW")
	getMessage         = user32.NewProc("GetMessageW")
	dispatchMessage    = user32.NewProc("DispatchMessageW")
	postMessage        = user32.NewProc("PostMessageW")
	registerRawDevices = user32.NewProc("RegisterRawInputDevices")
	getRawInput        = user32.NewProc("GetRawInputData")
	getAsyncKeyState   = user32.NewProc("GetAsyncKeyState")
	rawClassOnce       sync.Once
	rawClassErr        error
	rawClassInstance   windows.Handle
	rawClassName       = windows.StringToUTF16Ptr("CullPearShortcutRawInput")
	rawCallback        = syscall.NewCallback(rawWindowProc)
	rawWindows         sync.Map
)

type windowClass struct {
	Size, Style                        uint32
	Proc                               uintptr
	ClassExtra, WindowExtra            int32
	Instance, Icon, Cursor, Background uintptr
	MenuName, ClassName                *uint16
	SmallIcon                          uintptr
}

type message struct {
	Window         uintptr
	Message        uint32
	WParam, LParam uintptr
	Time           uint32
	X, Y           int32
	Private        uint32
}

type rawDevice struct {
	Page, Usage uint16
	Flags       uint32
	Target      uintptr
}

type rawHeader struct {
	Type, Size     uint32
	Device, WParam uintptr
}

type rawKeyboard struct {
	MakeCode, Flags, Reserved, VKey uint16
	Message, Extra                  uint32
}

type rawListener struct {
	key              uint16
	combo            bool
	devices          map[uintptr]*keyTracker
	initialModifiers keyTracker
	fire             func()
	failed           func(error)
	failureOnce      sync.Once
}

func rawWindowProc(hwnd, msg, wparam, lparam uintptr) uintptr {
	if value, ok := rawWindows.Load(hwnd); ok {
		listener := value.(*rawListener)
		switch msg {
		case wmInput:
			listener.read(lparam)
		case wmDevice:
			if wparam == 2 { // GIDC_REMOVAL
				delete(listener.devices, lparam)
			}
		}
	}
	// Required for foreground WM_INPUT cleanup; also handles all other messages.
	result, _, _ := defWindowProc.Call(hwnd, msg, wparam, lparam)
	return result
}

func (l *rawListener) read(handle uintptr) {
	// Keyboard packets fit this aligned buffer. Mouse/HID packets are not registered.
	var buffer [16]uint64
	size := uint32(unsafe.Sizeof(buffer))
	n, _, err := getRawInput.Call(handle, ridInput, uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(unsafe.Pointer(&size)), unsafe.Sizeof(rawHeader{}))
	if uint32(n) == ^uint32(0) {
		l.failureOnce.Do(func() { go l.failed(fmt.Errorf("读取 Raw Input 失败：%w", err)) })
		return
	}
	headerSize := unsafe.Sizeof(rawHeader{})
	if n < headerSize+unsafe.Sizeof(rawKeyboard{}) {
		return
	}
	header := (*rawHeader)(unsafe.Pointer(&buffer[0]))
	if header.Type != 1 { // RIM_TYPEKEYBOARD
		return
	}
	key := (*rawKeyboard)(unsafe.Add(unsafe.Pointer(&buffer[0]), headerSize))
	vkey := normalizeKey(key.VKey, key.MakeCode, key.Flags)
	if vkey < 256 {
		l.initialModifiers.down[vkey] = false
	}
	device := l.devices[header.Device]
	if device == nil {
		device = &keyTracker{}
		l.devices[header.Device] = device
	}
	first := device.update(vkey, key.Flags&1 != 0)
	if first && vkey == l.key && matchesModifiers(l.devices, l.combo) {
		go l.fire()
	}
}

func startRawKeyboard(ctx context.Context, key string, fire func(), failed func(error)) (func() error, error) {
	vkey, combo, err := parseKey(key)
	if err != nil {
		return nil, err
	}
	listener := &rawListener{key: vkey, combo: combo, devices: make(map[uintptr]*keyTracker), fire: fire, failed: failed}
	// Keep the initial held modifiers until their first physical event.
	listener.devices[^uintptr(0)] = &listener.initialModifiers
	ready := make(chan error, 1)
	done := make(chan struct{})
	var hwnd uintptr
	var cleanupErr error
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		defer close(done)
		rawClassOnce.Do(func() {
			if err := windows.GetModuleHandleEx(windows.GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, nil, &rawClassInstance); err != nil {
				rawClassErr = fmt.Errorf("获取 Raw Input 模块句柄失败：%w", err)
				return
			}
			class := windowClass{Proc: rawCallback, ClassName: rawClassName, Instance: uintptr(rawClassInstance)}
			class.Size = uint32(unsafe.Sizeof(class))
			if result, _, callErr := registerClass.Call(uintptr(unsafe.Pointer(&class))); result == 0 {
				rawClassErr = fmt.Errorf("创建 Raw Input 窗口类失败：%w", callErr)
			}
		})
		if rawClassErr != nil {
			ready <- rawClassErr
			return
		}
		var callErr error
		// HWND_MESSAGE creates a message-only window, independent of WebView focus.
		hwnd, _, callErr = createWindow.Call(0, uintptr(unsafe.Pointer(rawClassName)), 0, 0,
			0, 0, 0, 0, ^uintptr(2), 0, uintptr(rawClassInstance), 0)
		if hwnd == 0 {
			ready <- fmt.Errorf("创建 Raw Input 窗口失败：%w", callErr)
			return
		}
		defer destroyWindow.Call(hwnd)
		rawWindows.Store(hwnd, listener)
		defer rawWindows.Delete(hwnd)
		device := rawDevice{Page: 1, Usage: 6, Flags: ridevInputSink | ridevNotify, Target: hwnd}
		if result, _, callErr := registerRawDevices.Call(uintptr(unsafe.Pointer(&device)), 1, unsafe.Sizeof(device)); result == 0 {
			ready <- fmt.Errorf("注册 Raw Input 后台键盘失败：%w", callErr)
			return
		}
		defer func() {
			device.Flags, device.Target = ridevRemove, 0
			if result, _, callErr := registerRawDevices.Call(uintptr(unsafe.Pointer(&device)), 1, unsafe.Sizeof(device)); result == 0 {
				cleanupErr = fmt.Errorf("注销 Raw Input 失败：%w", callErr)
			}
		}()
		for _, modifier := range []uint16{0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C} {
			state, _, _ := getAsyncKeyState.Call(uintptr(modifier))
			listener.initialModifiers.down[modifier] = state&0x8000 != 0
		}
		ready <- nil
		var msg message
		for {
			result, _, callErr := getMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if int32(result) == -1 {
				failed(fmt.Errorf("Raw Input 消息循环失败：%w", callErr))
				return
			}
			if result == 0 || msg.Message == wmStop {
				return
			}
			dispatchMessage.Call(uintptr(unsafe.Pointer(&msg)))
		}
	}()
	if err := <-ready; err != nil {
		<-done
		return nil, err
	}
	stop := func() error {
		select {
		case <-done:
			return cleanupErr
		default:
		}
		if result, _, callErr := postMessage.Call(hwnd, wmStop, 0, 0); result == 0 {
			return fmt.Errorf("停止 Raw Input 失败：%w", callErr)
		}
		select {
		case <-done:
			return cleanupErr
		case <-time.After(3 * time.Second):
			return fmt.Errorf("等待 Raw Input 停止超时")
		}
	}
	go func() {
		select {
		case <-ctx.Done():
			if err := stop(); err != nil {
				failed(err)
			}
		case <-done:
		}
	}()
	return stop, nil
}
