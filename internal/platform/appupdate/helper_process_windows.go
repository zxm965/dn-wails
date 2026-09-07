//go:build windows

package appupdate

import (
	"os/exec"
	"syscall"
)

func configureUpdateHelperProcess(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{
		// DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP. CREATE_NO_WINDOW is
		// ignored when DETACHED_PROCESS is present and is intentionally omitted.
		CreationFlags: 0x00000008 | 0x00000200,
		HideWindow:    true,
	}
}
