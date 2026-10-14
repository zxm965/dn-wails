package appupdate

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Compile the real project, including its Wails macros, instead of asserting
// that a command string appears in the NSIS source. Windows additionally runs
// the resulting installer through the production PowerShell handoff.
func TestWindowsNSISUpdateEndToEnd(t *testing.T) {
	makensis := os.Getenv("CULL_PEAR_TEST_MAKENSIS")
	if makensis == "" {
		makensis, _ = exec.LookPath("makensis")
	}
	if makensis == "" {
		if os.Getenv("CULL_PEAR_REQUIRE_NSIS_TEST") == "1" {
			t.Fatal("NSIS is required for this release check")
		}
		t.Skip("makensis unavailable; Windows release job requires this test")
	}
	oldBinary, newBinary := buildUpdateFixtures(t)
	root := t.TempDir()
	nsisDirectory := filepath.Join(root, "build", "windows", "nsis")
	if err := os.MkdirAll(nsisDirectory, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, "bin"), 0o700); err != nil {
		t.Fatal(err)
	}
	repositoryWindows := filepath.Join("..", "..", "..", "build", "windows")
	for _, name := range []string{"project.nsi", "wails_tools.nsh"} {
		writeTestFile(t, filepath.Join(nsisDirectory, name), readTestFile(t, filepath.Join(repositoryWindows, "nsis", name)))
	}
	writeTestFile(t, filepath.Join(root, "build", "windows", "icon.ico"), readTestFile(t, filepath.Join(repositoryWindows, "icon.ico")))
	// A fixture instead of a real WebView bootstrapper makes accidental runtime
	// bootstrapping hang and fail the update deadline without installing anything.
	writeTestFile(t, filepath.Join(nsisDirectory, "MicrosoftEdgeWebview2Setup.exe"), readTestFile(t, newBinary))
	product := "Cull Pear Updater Test " + filepath.Base(filepath.Dir(root))
	company := "CullPearTests"
	if runtime.GOOS == "windows" {
		powershell := testPowerShell(t)
		cleanupConfig := filepath.Join(root, "cleanup.json")
		data, _ := json.Marshal(struct{ Product, Key string }{product, company + product})
		writeTestFile(t, cleanupConfig, data)
		cleanupPath := filepath.Join(root, "cleanup.ps1")
		writeTestFile(t, cleanupPath, []byte(`param([string]$ConfigPath)
$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($folder in @('Desktop', 'Programs')) {
  $path = Join-Path ([Environment]::GetFolderPath($folder)) ($config.Product + '.lnk')
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction Stop }
}
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\' + $config.Key
if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force -ErrorAction Stop }
`))
		t.Cleanup(func() {
			command := exec.Command(powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", cleanupPath, "-ConfigPath", cleanupConfig)
			if output, err := command.CombinedOutput(); err != nil {
				t.Errorf("clean isolated NSIS test registration: %v\n%s", err, output)
			}
		})
	}
	define := "-D"
	if runtime.GOOS == "windows" {
		define = "/D"
	}
	command := exec.Command(makensis,
		define+"WAILS_INSTALL_SCOPE=user", define+"REQUEST_EXECUTION_LEVEL=user",
		define+"INFO_PROJECTNAME=cull-pear", define+"INFO_PRODUCTNAME="+product,
		define+"INFO_COMPANYNAME="+company, define+"INFO_PRODUCTVERSION=1.2.3",
		define+"ARG_WAILS_AMD64_BINARY="+newBinary, "project.nsi")
	command.Dir = nsisDirectory
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("compile production NSIS project: %v\n%s", err, output)
	}
	installer := filepath.Join(root, "bin", "cull-pear-amd64-installer.exe")
	if info, err := os.Stat(installer); err != nil || info.Size() == 0 {
		t.Fatalf("missing compiled NSIS installer: %v", err)
	}
	if strings.Contains(string(output), "warning") {
		t.Logf("NSIS compiler output:\n%s", output)
	}
	if runtime.GOOS != "windows" {
		t.Log("production NSIS project compiled; native execution is required by the Windows release job")
		return
	}
	for _, scenario := range []string{"success", "image-lock"} {
		t.Run(scenario, func(t *testing.T) {
			runUpdateSimulation(t, testPowerShell(t), oldBinary, newBinary, scenario, installer)
		})
	}
}
