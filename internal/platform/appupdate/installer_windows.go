//go:build windows

package appupdate

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
)

func (i *Installer) Supported() bool {
	return i.appName != ""
}

func (i *Installer) Install(_ context.Context, archivePath string) error {
	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve current executable: %w", err)
	}
	workDirectory, err := os.MkdirTemp("", i.appName+"-install-*")
	if err != nil {
		return fmt.Errorf("create installer directory: %w", err)
	}
	cleanup := true
	defer func() {
		if cleanup {
			os.RemoveAll(workDirectory)
		}
	}()

	installerPath := filepath.Join(workDirectory, filepath.Base(archivePath))
	if err := copyFile(archivePath, installerPath); err != nil {
		return err
	}
	scriptPath := filepath.Join(workDirectory, "install-update.ps1")
	if err := os.WriteFile(scriptPath, []byte(windowsUpdateScript), 0o600); err != nil {
		return fmt.Errorf("write update helper: %w", err)
	}
	logPath := filepath.Join(os.TempDir(), fmt.Sprintf("%s-update-%d.log", i.appName, os.Getpid()))

	command := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy", "Bypass",
		"-File", scriptPath,
		"-ProcessId", strconv.Itoa(os.Getpid()),
		"-InstallerPath", installerPath,
		"-ExecutablePath", executablePath,
		"-LogPath", logPath,
	)
	command.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x00000008 | 0x00000200 | 0x08000000,
		HideWindow:    true,
	}
	if err := command.Start(); err != nil {
		return fmt.Errorf("start update helper: %w", err)
	}
	if err := command.Process.Release(); err != nil {
		return fmt.Errorf("detach update helper: %w", err)
	}

	cleanup = false
	return nil
}

func copyFile(source string, destination string) error {
	input, err := os.Open(source)
	if err != nil {
		return fmt.Errorf("open downloaded installer: %w", err)
	}
	defer input.Close()

	output, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("create staged installer: %w", err)
	}
	if _, err := io.Copy(output, input); err != nil {
		output.Close()
		return fmt.Errorf("copy staged installer: %w", err)
	}
	if err := output.Close(); err != nil {
		return fmt.Errorf("close staged installer: %w", err)
	}
	return nil
}
