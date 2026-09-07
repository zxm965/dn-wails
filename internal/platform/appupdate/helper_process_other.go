//go:build !windows

package appupdate

import "os/exec"

// Only the Windows update integration simulations use this on other systems.
func configureUpdateHelperProcess(_ *exec.Cmd) {}
