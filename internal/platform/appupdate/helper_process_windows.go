//go:build windows

package appupdate

import (
	"os/exec"
	"syscall"
)

func configureUpdateHelperProcess(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{
		// Windows PowerShell 5.1 needs a windowless console to initialise
		// reliably. DETACHED_PROCESS can exit before running a -File script.
		CreationFlags: 0x08000000 | 0x00000200, // CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
		HideWindow:    true,
	}
}
