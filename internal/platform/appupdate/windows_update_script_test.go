package appupdate

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
