//go:build !windows

package appupdate

import "testing"

func lockUpdateImageForTest(t *testing.T, _ string) func() {
	t.Helper()
	t.Fatal("kernel image-lock regression requires Windows")
	return func() {}
}
