package appupdate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

func testPowerShell(t *testing.T) string {
	t.Helper()
	if path := os.Getenv("CULL_PEAR_TEST_POWERSHELL"); path != "" {
		return path
	}
	for _, name := range []string{"powershell.exe", "pwsh"} {
		if path, err := exec.LookPath(name); err == nil {
			return path
		}
	}
	if runtime.GOOS == "windows" {
		t.Fatal("Windows updater tests require Windows PowerShell")
	}
	t.Skip("set CULL_PEAR_TEST_POWERSHELL to execute the actual updater script")
	return ""
}

func buildUpdateFixtures(t *testing.T) (string, string) {
	t.Helper()
	directory := t.TempDir()
	paths := make([]string, 0, 2)
	for _, version := range []string{"old", "new"} {
		path := filepath.Join(directory, version+".exe")
		command := exec.Command("go", "build", "-o", path, "-ldflags", "-X main.version="+version, "./testdata/updatefixture")
		if output, err := command.CombinedOutput(); err != nil {
			t.Fatalf("build fixture: %v\n%s", err, output)
		}
		paths = append(paths, path)
	}
	return paths[0], paths[1]
}

func writeTestFile(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.WriteFile(path, data, 0o700); err != nil {
		t.Fatal(err)
	}
}

func readTestFile(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func testHash(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

func TestWindowsUpdateScriptIntegration(t *testing.T) {
	powershell := testPowerShell(t)
	oldBinary, newBinary := buildUpdateFixtures(t)
	for _, scenario := range []string{
		"success", "renamed", "transient-lock", "installer-failure", "unchanged",
		"wrong-hash", "restart-failure", "timeout", "persistent-lock", "parent-alive",
		"installer-corrupt", "unwritable-directory", "script-startup-failure",
		"wizard-success", "wizard-cancel", "wizard-no-launch", "wizard-long-wait",
	} {
		t.Run(scenario, func(t *testing.T) {
			t.Parallel()
			runUpdateSimulation(t, powershell, oldBinary, newBinary, scenario, "")
		})
	}
}

// macOS/Linux replace taskkill with .NET process tree termination and bypass
// the Windows shell UI boundary for disposable console fixtures. The actual
// handoff, arguments, hashing, file operations, waits and recovery still run.
const unixProcessTreeSimulation = `
function Stop-UpdateProcessTree {
  param($Process)
  if (-not $Process.HasExited) {
    $Process.Kill($true)
    if (-not $Process.WaitForExit(10000)) { throw 'simulation process tree did not stop' }
  }
}
`

func runUpdateSimulation(t *testing.T, powershell, oldBinary, newBinary, scenario, nativeInstaller string) {
	t.Helper()
	root := t.TempDir()
	applicationDirectory := filepath.Join(root, "应用 [test] with spaces")
	stage := filepath.Join(root, "stage")
	for _, path := range []string{applicationDirectory, stage} {
		if err := os.Mkdir(path, 0o700); err != nil {
			t.Fatal(err)
		}
	}
	target := filepath.Join(applicationDirectory, "cull-pear.exe")
	current := target
	if scenario == "renamed" {
		current = filepath.Join(applicationDirectory, "renamed app.exe")
	}
	oldData := readTestFile(t, oldBinary)
	newData := readTestFile(t, newBinary)
	writeTestFile(t, current, oldData)
	writeTestFile(t, filepath.Join(applicationDirectory, "user-settings.json"), []byte("preserve me"))
	installerPath := filepath.Join(stage, "installer.exe")
	installerData := newData
	if nativeInstaller != "" {
		installerData = readTestFile(t, nativeInstaller)
	}
	writeTestFile(t, installerPath, installerData)
	audit := filepath.Join(root, "audit.log")
	fixtureConfig := filepath.Join(root, "fixture.json")
	data, _ := json.Marshal(struct{ Target, Payload, Scenario, Audit string }{target, newBinary, scenario, audit})
	writeTestFile(t, fixtureConfig, data)
	environment := append(os.Environ(), "CULL_PEAR_UPDATE_SIMULATION="+fixtureConfig)
	var parent *exec.Cmd
	if err := startUpdateFixtureProcess(func() error {
		// A failed Start still consumes a Cmd; create a fresh one on every attempt.
		parent = exec.Command(current)
		parent.Env = environment
		return parent.Start()
	}, 2*time.Second); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = parent.Process.Kill()
		_ = parent.Wait()
		// Reap all disposable restarted applications/installer descendants.
		data, _ := os.ReadFile(audit)
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "app:") || strings.HasPrefix(line, "child:") {
				parts := strings.Split(line, ":")
				pid, _ := strconv.Atoi(parts[len(parts)-1])
				if pid > 0 {
					process, _ := os.FindProcess(pid)
					if process != nil {
						_ = process.Kill()
						_, _ = process.Wait()
					}
				}
			}
		}
	})
	// Start() only proves process creation. In particular, a cold macOS code
	// signature check can delay entry into main under full-suite load.
	waitForAudit(t, audit, "app:old:", 1)
	config := windowsUpdateConfig{
		ProcessID: parent.Process.Pid, InstallerPath: installerPath, ExecutablePath: current, TargetPath: target,
		InstallerSHA256: testHash(installerData), ExecutableSHA256: testHash(newData), Version: "1.2.3",
		LogPath: filepath.Join(root, "helper.log"), ResultPath: filepath.Join(root, "result.json"),
		ReadyPath: filepath.Join(stage, "ready"), CommitPath: filepath.Join(stage, "commit"), WorkDirectory: stage,
		ParentTimeoutSeconds: 5, InstallTimeoutSeconds: 15,
	}
	t.Cleanup(func() {
		if t.Failed() {
			log, _ := os.ReadFile(config.LogPath)
			auditData, _ := os.ReadFile(audit)
			t.Logf("helper log:\n%s\naudit:\n%s", log, auditData)
		}
	})
	if scenario == "timeout" {
		config.InstallTimeoutSeconds = 1
	}
	if strings.HasPrefix(scenario, "wizard-") {
		config.Interactive = true
	}
	if scenario == "wizard-long-wait" {
		config.InstallTimeoutSeconds = 1
	}
	if scenario == "parent-alive" {
		config.ParentTimeoutSeconds = 1
	}
	if scenario == "installer-corrupt" {
		config.InstallerSHA256 = strings.Repeat("0", 64)
	}
	if scenario == "unwritable-directory" {
		// A file cannot be used as a directory on any of the supported systems.
		config.TargetPath = filepath.Join(current, "cull-pear.exe")
	}
	data, _ = json.Marshal(config)
	configPath := filepath.Join(stage, "config.json")
	writeTestFile(t, configPath, data)
	script := windowsUpdateScript
	if runtime.GOOS != "windows" {
		script = strings.Replace(script, "$parentExited = $false", unixProcessTreeSimulation+"\n$parentExited = $false", 1)
		script = strings.Replace(script, "$startInfo.UseShellExecute = $Visible", "$startInfo.UseShellExecute = $false", 1)
	}
	if scenario == "script-startup-failure" {
		script = "throw 'simulated PowerShell startup failure'"
	}
	scriptPath := filepath.Join(stage, "update.ps1")
	writeTestFile(t, scriptPath, []byte(script))
	command := exec.Command(powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-ConfigPath", configPath)
	command.Env = environment
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	completed, err := launchWindowsUpdateHelper(ctx, command, config, 15*time.Second)
	preflightFailure := scenario == "installer-corrupt" || scenario == "unwritable-directory" || scenario == "script-startup-failure"
	if preflightFailure {
		if err == nil {
			t.Fatal("expected helper readiness to fail")
		}
		if _, err := os.Stat(config.CommitPath); !os.IsNotExist(err) {
			t.Fatal("failed helper must never receive commit")
		}
		if testHash(readTestFile(t, current)) != testHash(oldData) {
			t.Fatal("preflight failure modified current executable")
		}
		log := string(readTestFile(t, config.LogPath))
		if log == "" {
			t.Fatal("helper startup failure was not captured")
		}
		if readUpdateError(config.ResultPath) == "" {
			t.Fatal("helper startup failure was not persisted")
		}
		return
	}
	if err != nil {
		t.Fatalf("launch helper: %v\n%s", err, readTestFile(t, config.LogPath))
	}
	// No installer is allowed to run while the old application is alive.
	if data, _ := os.ReadFile(audit); strings.Contains(string(data), "installer:") {
		t.Fatal("installer started before parent exit")
	}
	if scenario != "parent-alive" {
		if err := parent.Process.Kill(); err != nil {
			t.Fatal(err)
		}
		_ = parent.Wait()
	}
	if scenario == "image-lock" {
		release := lockUpdateImageForTest(t, target)
		t.Cleanup(release)
		file, err := os.OpenFile(target, os.O_WRONLY, 0)
		if err == nil {
			file.Close()
			t.Fatal("fixture lock did not prevent overwriting the old executable")
		}
	}
	select {
	case <-completed:
	case <-time.After(25 * time.Second):
		_ = command.Process.Kill()
		t.Fatalf("helper did not finish\n%s", readTestFile(t, config.LogPath))
	}

	var result updateResult
	if err := json.Unmarshal(readTestFile(t, config.ResultPath), &result); err != nil {
		t.Fatal(err)
	}
	success := scenario == "success" || scenario == "renamed" || scenario == "transient-lock" || scenario == "image-lock" ||
		scenario == "wizard-success" || scenario == "wizard-no-launch" || scenario == "wizard-long-wait"
	if success {
		if _, err := os.Stat(stage); !os.IsNotExist(err) {
			t.Fatal("successful helper did not clean its staging directory")
		}
		if result.Status != "succeeded" {
			t.Fatalf("unexpected result: %+v", result)
		}
		if testHash(readTestFile(t, target)) != config.ExecutableSHA256 {
			t.Fatal("wrong installed binary")
		}
		if scenario == "wizard-no-launch" {
			if strings.Contains(string(readTestFile(t, audit)), "app:new:") {
				t.Fatal("unchecked launch checkbox must leave the updated application closed")
			}
		} else {
			waitForAudit(t, audit, "app:new:cull-pear.exe:", 1)
		}
		if scenario == "renamed" && testHash(readTestFile(t, current)) != testHash(oldData) {
			t.Fatal("renamed original was unexpectedly removed")
		}
	} else {
		if result.Status != "failed" {
			t.Fatalf("unexpected result: %+v", result)
		}
		if testHash(readTestFile(t, current)) != testHash(oldData) {
			t.Fatal("old executable was not restored")
		}
		if readUpdateError(config.ResultPath) == "" {
			t.Fatal("failure is not visible on next launch")
		}
		if scenario != "parent-alive" {
			waitForAudit(t, audit, "app:old:", 2)
		}
	}
	if string(readTestFile(t, filepath.Join(applicationDirectory, "user-settings.json"))) != "preserve me" {
		t.Fatal("user settings were modified")
	}
	t.Logf("%s: status=%s; target and launched process verified", scenario, result.Status)
}

// Linux can briefly reject a freshly copied fixture with ETXTBSY under parallel
// process creation. Retry only that transient error, with a bounded deadline.
func startUpdateFixtureProcess(start func() error, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		err := start()
		if !errors.Is(err, syscall.ETXTBSY) {
			return err
		}
		remaining := time.Until(deadline)
		if remaining <= 0 {
			return fmt.Errorf("start update fixture after text-file-busy retries: %w", err)
		}
		time.Sleep(min(10*time.Millisecond, remaining))
	}
}

func TestStartUpdateFixtureProcess(t *testing.T) {
	busy := &os.PathError{Op: "fork/exec", Path: "fixture.exe", Err: syscall.ETXTBSY}
	for _, test := range []struct {
		name       string
		failures   int
		startError error
		wantError  error
	}{
		{name: "success"},
		{name: "transient text file busy", failures: 2, startError: busy},
		{name: "permission denied", failures: 1, startError: os.ErrPermission, wantError: os.ErrPermission},
		{name: "deadline", failures: -1, startError: busy, wantError: syscall.ETXTBSY},
	} {
		t.Run(test.name, func(t *testing.T) {
			attempts := 0
			timeout := time.Second
			if test.failures < 0 {
				timeout = 20 * time.Millisecond
			}
			err := startUpdateFixtureProcess(func() error {
				attempts++
				if test.failures < 0 || attempts <= test.failures {
					return test.startError
				}
				return nil
			}, timeout)
			if !errors.Is(err, test.wantError) {
				t.Fatalf("expected error %v, got %v", test.wantError, err)
			}
			if test.failures >= 0 {
				wantAttempts := test.failures + 1
				if test.wantError != nil {
					wantAttempts = 1
				}
				if attempts != wantAttempts {
					t.Fatalf("expected %d attempts, got %d", wantAttempts, attempts)
				}
			}
		})
	}
}

func waitForAudit(t *testing.T, path, marker string, count int) {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for {
		data, _ := os.ReadFile(path)
		if strings.Count(string(data), marker) >= count {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("application did not reach its startup marker %q (%d times):\n%s", marker, count, data)
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func TestUpdateHelperReadinessTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	err := waitForUpdateHelper(ctx, filepath.Join(t.TempDir(), "ready"), make(chan error))
	if err != context.DeadlineExceeded {
		t.Fatalf("expected deadline, got %v", err)
	}
}

func TestUpdateHelperEarlyExit(t *testing.T) {
	done := make(chan error, 1)
	done <- fmt.Errorf("script failed")
	err := waitForUpdateHelper(context.Background(), filepath.Join(t.TempDir(), "ready"), done)
	if err == nil || !strings.Contains(err.Error(), "script failed") {
		t.Fatalf("expected script error, got %v", err)
	}
}

func TestUpdateHelperCancellationDoesNotCommit(t *testing.T) {
	powershell := testPowerShell(t)
	root := t.TempDir()
	config := windowsUpdateConfig{LogPath: filepath.Join(root, "helper.log"), WorkDirectory: root, ReadyPath: filepath.Join(root, "ready"), CommitPath: filepath.Join(root, "commit")}
	command := exec.Command(powershell, "-NoProfile", "-NonInteractive", "-Command", "Start-Sleep -Seconds 30")
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if _, err := launchWindowsUpdateHelper(ctx, command, config, time.Second); err == nil {
		t.Fatal("expected cancellation error")
	}
	if _, err := os.Stat(config.CommitPath); !os.IsNotExist(err) {
		t.Fatal("cancelled handoff was committed")
	}
}
