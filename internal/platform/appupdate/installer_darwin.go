//go:build darwin

package appupdate

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

const darwinUpdateScript = `#!/bin/sh
pid="$1"
source_app="$2"
target_app="$3"
work_dir="$4"
backup_app="${target_app}.previous"
staged_app="${target_app}.update"

while kill -0 "$pid" 2>/dev/null; do
  sleep 1
done

rm -rf "$backup_app" "$staged_app"
if ! /usr/bin/ditto "$source_app" "$staged_app"; then
  exit 1
fi
if ! mv "$target_app" "$backup_app"; then
  exit 1
fi
if mv "$staged_app" "$target_app"; then
  rm -rf "$backup_app"
  open "$target_app"
  rm -rf "$work_dir"
  exit 0
fi

mv "$backup_app" "$target_app"
open "$target_app"
exit 1
`

func (i *Installer) Supported() bool {
	return i.appName != ""
}

func (i *Installer) Install(ctx context.Context, archivePath string) error {
	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve current executable: %w", err)
	}
	targetApp := filepath.Dir(filepath.Dir(filepath.Dir(executablePath)))
	if filepath.Ext(targetApp) != ".app" {
		return fmt.Errorf("current executable is not inside an application bundle")
	}

	parentDirectory := filepath.Dir(targetApp)
	probe, err := os.CreateTemp(parentDirectory, ".dn-wails-update-probe-*")
	if err != nil {
		return fmt.Errorf("application directory is not writable: %w", err)
	}
	probe.Close()
	os.Remove(probe.Name())

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

	extractDirectory := filepath.Join(workDirectory, "archive")
	if err := os.Mkdir(extractDirectory, 0o700); err != nil {
		return fmt.Errorf("create update extraction directory: %w", err)
	}
	if output, err := exec.CommandContext(ctx, "/usr/bin/ditto", "-x", "-k", archivePath, extractDirectory).CombinedOutput(); err != nil {
		return fmt.Errorf("extract update archive: %w: %s", err, output)
	}

	sourceApp := filepath.Join(extractDirectory, i.appName+".app")
	if info, err := os.Stat(sourceApp); err != nil || !info.IsDir() {
		return fmt.Errorf("update archive does not contain %s.app", i.appName)
	}

	scriptPath := filepath.Join(workDirectory, "install-update.sh")
	if err := os.WriteFile(scriptPath, []byte(darwinUpdateScript), 0o700); err != nil {
		return fmt.Errorf("write update helper: %w", err)
	}

	command := exec.Command(scriptPath, fmt.Sprintf("%d", os.Getpid()), sourceApp, targetApp, workDirectory)
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := command.Start(); err != nil {
		return fmt.Errorf("start update helper: %w", err)
	}
	if err := command.Process.Release(); err != nil {
		return fmt.Errorf("detach update helper: %w", err)
	}

	cleanup = false
	return nil
}
