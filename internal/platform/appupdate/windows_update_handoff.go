package appupdate

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// windowsUpdateConfig is file-backed so paths are not interpolated into a
// PowerShell command. The helper cannot install before the parent commits the
// handoff AND exits. Interactive installers wait for the user without a
// deadline; parent handoff and headless installation remain bounded.
type windowsUpdateConfig struct {
	ProcessID             int    `json:"processId"`
	InstallerPath         string `json:"installerPath"`
	ExecutablePath        string `json:"executablePath"`
	TargetPath            string `json:"targetPath"`
	InstallerSHA256       string `json:"installerSHA256"`
	ExecutableSHA256      string `json:"executableSHA256"`
	Version               string `json:"version"`
	LogPath               string `json:"logPath"`
	ResultPath            string `json:"resultPath"`
	ReadyPath             string `json:"readyPath"`
	CommitPath            string `json:"commitPath"`
	WorkDirectory         string `json:"workDirectory"`
	ParentTimeoutSeconds  int    `json:"parentTimeoutSeconds"`
	InstallTimeoutSeconds int    `json:"installTimeoutSeconds"`
	Interactive           bool   `json:"interactive"`
}

func launchWindowsUpdateHelper(ctx context.Context, command *exec.Cmd, config windowsUpdateConfig, timeout time.Duration) (completion <-chan error, resultErr error) {
	defer func() {
		if resultErr == nil || config.ResultPath == "" {
			return
		}
		data, err := json.Marshal(updateResult{Status: "failed", Version: config.Version, Message: resultErr.Error(), LogPath: config.LogPath})
		if err == nil {
			err = os.WriteFile(config.ResultPath+".go.tmp", data, 0o600)
		}
		if err == nil {
			err = os.Rename(config.ResultPath+".go.tmp", config.ResultPath)
		}
		if err != nil {
			resultErr = errors.Join(resultErr, fmt.Errorf("persist helper startup failure: %w", err))
		}
	}()
	configureUpdateHelperProcess(command)
	// Windows holds the process working directory open. Do not pin the staging
	// directory, which the helper removes once the update has succeeded.
	command.Dir = filepath.Dir(config.LogPath)
	output, err := os.OpenFile(config.LogPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, fmt.Errorf("open update helper log: %w", err)
	}
	command.Stdout = output
	command.Stderr = output
	// Do not use CommandContext: cancellation of the Wails runtime after the
	// handoff must not kill the installer. Cancellation before readiness does.
	err = command.Start()
	output.Close() // The child owns its inherited handle from this point on.
	if err != nil {
		return nil, fmt.Errorf("start update helper: %w (log: %s)", err, config.LogPath)
	}
	done := make(chan error, 1)
	go func() { done <- command.Wait(); close(done) }()
	stop := func() {
		_ = command.Process.Kill()
		// Waiting also prevents the dying script from overwriting the launcher's
		// persisted failure with a late "prepared" result.
		select {
		case <-done:
		case <-time.After(5 * time.Second):
		}
	}
	readyContext, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if err := waitForUpdateHelper(readyContext, config.ReadyPath, done); err != nil {
		stop()
		return nil, fmt.Errorf("update helper was not ready: %w (log: %s)", err, config.LogPath)
	}
	if err := ctx.Err(); err != nil {
		stop()
		return nil, err
	}
	// Publish only a closed file: ReadAllText in Windows PowerShell can reject
	// a file that is still open for writing, even for this very short marker.
	if err := os.WriteFile(config.CommitPath+".tmp", []byte("commit"), 0o600); err != nil {
		stop()
		return nil, fmt.Errorf("prepare update handoff commit: %w", err)
	}
	if err := os.Rename(config.CommitPath+".tmp", config.CommitPath); err != nil {
		stop()
		return nil, fmt.Errorf("commit update handoff: %w", err)
	}
	return done, nil
}

func waitForUpdateHelper(ctx context.Context, readyPath string, done <-chan error) error {
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case err := <-done:
			if err == nil {
				err = errors.New("helper exited before handoff")
			}
			return err
		case <-ticker.C:
			data, err := os.ReadFile(readyPath)
			if err == nil && string(data) == "ready" {
				select {
				case <-done:
					return errors.New("helper exited after readiness")
				default:
				}
				return nil
			}
			if err != nil && !errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("read helper readiness: %w", err)
			}
		}
	}
}
