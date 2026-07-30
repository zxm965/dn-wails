//go:build dev

package singleinstance

// enabled stays false for wails dev so a rebuilt backend can replace the
// currently running process instead of being handled as a second instance.
func enabled() bool {
	return false
}
