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
mount_dir="$4"
work_dir="$5"
backup_app="${target_app}.previous"
staged_app="${target_app}.update"

detach_image() {
  /usr/bin/hdiutil detach -quiet "$mount_dir" >/dev/null 2>&1 || true
}

while kill -0 "$pid" 2>/dev/null; do
  sleep 1
done

/bin/rm -rf "$backup_app" "$staged_app"
if ! /usr/bin/ditto "$source_app" "$staged_app"; then
  detach_image
  /bin/rm -rf "$work_dir"
  exit 1
fi
if ! /bin/mv "$target_app" "$backup_app"; then
  detach_image
  /bin/rm -rf "$staged_app" "$work_dir"
  exit 1
fi
if /bin/mv "$staged_app" "$target_app"; then
  /bin/rm -rf "$backup_app"
  detach_image
  /usr/bin/open "$target_app"
  /bin/rm -rf "$work_dir"
  exit 0
fi

/bin/mv "$backup_app" "$target_app"
detach_image
/usr/bin/open "$target_app"
/bin/rm -rf "$work_dir"
exit 1
`

func (i *Installer) Supported() bool {
	return i.appName != ""
}

func (i *Installer) Install(ctx context.Context, imagePath string) error {
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
	mountDirectory := filepath.Join(workDirectory, "volume")
	cleanup := true
	defer func() {
		if cleanup {
			detachDiskImage(mountDirectory)
			os.RemoveAll(workDirectory)
		}
	}()

	if err := os.Mkdir(mountDirectory, 0o700); err != nil {
		return fmt.Errorf("create update mount directory: %w", err)
	}
	if output, err := exec.CommandContext(
		ctx,
		"/usr/bin/hdiutil",
		"attach",
		"-nobrowse",
		"-readonly",
		"-mountpoint",
		mountDirectory,
		imagePath,
	).CombinedOutput(); err != nil {
		return fmt.Errorf("mount update disk image: %w: %s", err, output)
	}

	sourceApp := filepath.Join(mountDirectory, i.appName+".app")
	if info, err := os.Stat(sourceApp); err != nil || !info.IsDir() {
		return fmt.Errorf("update disk image does not contain %s.app", i.appName)
	}

	scriptPath := filepath.Join(workDirectory, "install-update.sh")
	if err := os.WriteFile(scriptPath, []byte(darwinUpdateScript), 0o700); err != nil {
		return fmt.Errorf("write update helper: %w", err)
	}

	command := exec.Command(scriptPath, fmt.Sprintf("%d", os.Getpid()), sourceApp, targetApp, mountDirectory, workDirectory)
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := command.Start(); err != nil {
		return fmt.Errorf("start update helper: %w", err)
	}
	if err := command.Process.Release(); err != nil {
		_ = command.Process.Kill()
		return fmt.Errorf("detach update helper: %w", err)
	}

	cleanup = false
	return nil
}

func detachDiskImage(mountDirectory string) {
	if mountDirectory == "" {
		return
	}
	_ = exec.Command("/usr/bin/hdiutil", "detach", "-quiet", mountDirectory).Run()
}
