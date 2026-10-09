package appupdate

import (
	"testing"

	"golang.org/x/sys/windows"
)

// Hold a kernel file handle that permits rename but rejects in-place writes,
// reproducing the image-lock condition without starting a real desktop app.
func lockUpdateImageForTest(t *testing.T, path string) func() {
	t.Helper()
	name, err := windows.UTF16PtrFromString(path)
	if err != nil {
		t.Fatal(err)
	}
	handle, err := windows.CreateFile(name, windows.GENERIC_READ,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_DELETE, nil,
		windows.OPEN_EXISTING, windows.FILE_ATTRIBUTE_NORMAL, 0)
	if err != nil {
		t.Fatal(err)
	}
	return func() {
		if err := windows.CloseHandle(handle); err != nil {
			t.Errorf("release old executable lock: %v", err)
		}
	}
}
