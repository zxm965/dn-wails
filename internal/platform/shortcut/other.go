//go:build !windows

package shortcut

// New preserves the existing Wails behavior on macOS and Linux.
func New(native Native) Native {
	return native
}
