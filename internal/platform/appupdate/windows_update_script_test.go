package appupdate

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWindowsUpdateScriptProtectsInstallAndRestartHandoff(t *testing.T) {
	t.Parallel()

	for _, fragment := range []string{
		"timed out waiting for process",
		"Start-Sleep -Milliseconds 1000",
		"install target resolved to $applicationDirectory",
		"Get-FileHash -LiteralPath $ExecutablePath -Algorithm SHA256",
		"for ($attempt = 1; $attempt -le 20; $attempt++)",
		`-ArgumentList @('/S', "/D=$applicationDirectory")`,
		"installer did not replace the installed executable",
		"for ($attempt = 1; $attempt -le 3; $attempt++)",
		"Start-Process -FilePath $ExecutablePath -WorkingDirectory $applicationDirectory -PassThru",
		"restarted existing application after update failure",
	} {
		if !strings.Contains(windowsUpdateScript, fragment) {
			t.Fatalf("windows update script is missing %q", fragment)
		}
	}
}

func TestWindowsNSISInstallerRecoversPreviousInstallDirectory(t *testing.T) {
	t.Parallel()

	projectPath := filepath.Join("..", "..", "..", "build", "windows", "nsis", "project.nsi")
	content, err := os.ReadFile(projectPath)
	if err != nil {
		t.Fatalf("read Windows NSIS project: %v", err)
	}
	project := string(content)
	for _, fragment := range []string{
		`!define DEFAULT_INSTALL_DIR`,
		`ReadRegStr $0 HKCU "${UNINST_KEY}" "InstallLocation"`,
		`ReadRegStr $1 HKCU "${UNINST_KEY}" "DisplayIcon"`,
		`IfFileExists "$0\${PRODUCT_EXECUTABLE}"`,
		`WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"`,
	} {
		if !strings.Contains(project, fragment) {
			t.Fatalf("Windows NSIS project is missing %q", fragment)
		}
	}
}
