package appupdate

import "testing"

func TestNewInstallerNormalisesNames(t *testing.T) {
	t.Parallel()

	installer := NewInstaller(" cull-pear ", " Cull Pear ")
	if installer.appName != "cull-pear" || installer.bundleName != "Cull Pear" {
		t.Fatalf("unexpected installer names: %+v", installer)
	}
}

func TestNewInstallerRejectsUnsafeBundleName(t *testing.T) {
	t.Parallel()

	for _, bundleName := range []string{"", ".", "..", "Cull/Pear", `Cull\Pear`, "Cull:Pear"} {
		installer := NewInstaller("cull-pear", bundleName)
		if installer.bundleName != "" {
			t.Fatalf("expected unsafe bundle name %q to be rejected", bundleName)
		}
	}
}
