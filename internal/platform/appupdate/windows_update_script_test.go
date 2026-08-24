package appupdate

import (
	"strings"
	"testing"
)

func TestWindowsUpdateScriptProtectsInstallAndRestartHandoff(t *testing.T) {
	t.Parallel()

	for _, fragment := range []string{
		"timed out waiting for process",
		"Start-Sleep -Milliseconds 1000",
		"Get-FileHash -LiteralPath $ExecutablePath -Algorithm SHA256",
		"for ($attempt = 1; $attempt -le 20; $attempt++)",
		"installer did not replace the installed executable",
		"for ($attempt = 1; $attempt -le 3; $attempt++)",
		"Start-Process -FilePath $ExecutablePath -WorkingDirectory $applicationDirectory -PassThru",
	} {
		if !strings.Contains(windowsUpdateScript, fragment) {
			t.Fatalf("windows update script is missing %q", fragment)
		}
	}
}
