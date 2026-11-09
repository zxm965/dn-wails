//go:build !windows

package fontpatch

import "os/exec"

func configureCommand(_ *exec.Cmd) {}
