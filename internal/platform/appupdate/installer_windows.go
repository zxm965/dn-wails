//go:build windows

package appupdate

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	coreupdate "cull-pear/internal/appupdate"
)

func (i *Installer) Supported() bool {
	return i.appName != ""
}

func (i *Installer) Install(ctx context.Context, archivePath string, target coreupdate.InstallTarget) error {
	installerDigest, err := parseSHA256Digest(target.InstallerDigest)
	if err != nil {
		return err
	}
	executableDigest, err := parseSHA256Digest(target.ExecutableDigest)
	if err != nil {
		return err
	}
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
	resultPath, err := i.resultPath()
	if err != nil {
		return err
	}
	logDirectory := filepath.Join(filepath.Dir(resultPath), "update-logs")
	if err := os.MkdirAll(logDirectory, 0o700); err != nil {
		return fmt.Errorf("create update log directory: %w", err)
	}
	config := windowsUpdateConfig{
		ProcessID:             os.Getpid(),
		InstallerPath:         installerPath,
		ExecutablePath:        executablePath,
		TargetPath:            filepath.Join(filepath.Dir(executablePath), i.appName+".exe"),
		InstallerSHA256:       installerDigest,
		ExecutableSHA256:      executableDigest,
		Version:               target.Version,
		LogPath:               filepath.Join(logDirectory, filepath.Base(workDirectory)+".log"),
		ResultPath:            resultPath,
		ReadyPath:             filepath.Join(workDirectory, "ready"),
		CommitPath:            filepath.Join(workDirectory, "commit"),
		WorkDirectory:         workDirectory,
		ParentTimeoutSeconds:  60,
		InstallTimeoutSeconds: 120,
	}
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("encode update helper configuration: %w", err)
	}
	configPath := filepath.Join(workDirectory, "config.json")
	if err := os.WriteFile(configPath, data, 0o600); err != nil {
		return fmt.Errorf("write update helper configuration: %w", err)
	}

	command := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy", "Bypass",
		"-File", scriptPath,
		"-ConfigPath", configPath,
	)
	if _, err := launchWindowsUpdateHelper(ctx, command, config, 20*time.Second); err != nil {
		return err
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
