//go:build windows

package appupdate

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Exercise powershell.exe itself, not just CreateProcess success. Incorrect
// console flags can silently skip even a -File script in Windows PowerShell 5.1.
func TestWindowsPowerShellExecutesHiddenScript(t *testing.T) {
	root := t.TempDir()
	script := filepath.Join(root, "probe.ps1")
	writeTestFile(t, script, []byte("[Console]::Out.WriteLine('stdout probe'); [Console]::Error.WriteLine('stderr probe'); exit 23"))
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, testPowerShell(t), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script)
	configureUpdateHelperProcess(command)
	outputPath := filepath.Join(root, "probe.log")
	output, err := os.Create(outputPath)
	if err != nil {
		t.Fatal(err)
	}
	command.Stdout, command.Stderr = output, output
	err = command.Run()
	output.Close()
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || exitError.ExitCode() != 23 {
		t.Fatalf("PowerShell did not execute the script: %v; output: %s", err, readTestFile(t, outputPath))
	}
	log := string(readTestFile(t, outputPath))
	if !strings.Contains(log, "stdout probe") || !strings.Contains(log, "stderr probe") {
		t.Fatalf("PowerShell output was lost: %q", log)
	}
}
