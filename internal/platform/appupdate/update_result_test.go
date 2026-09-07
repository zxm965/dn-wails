package appupdate

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadUpdateResult(t *testing.T) {
	t.Parallel()
	for _, test := range []struct{ name, data, want string }{
		{"success", `{"status":"succeeded"}`, ""},
		{"failure", `{"status":"failed","version":"1.2.3","message":"installer timed out","logPath":"C:/update.log"}`, "installer timed out"},
		{"interrupted", `{"status":"installing","version":"1.2.3","logPath":"C:/update.log"}`, "更新中断"},
		{"invalid", `{`, "结果文件无效"},
	} {
		t.Run(test.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "result.json")
			if err := os.WriteFile(path, []byte(test.data), 0o600); err != nil {
				t.Fatal(err)
			}
			got := readUpdateError(path)
			if (test.want == "" && got != "") || (test.want != "" && !strings.Contains(got, test.want)) {
				t.Fatalf("unexpected result: %q", got)
			}
		})
	}
	if got := readUpdateError(filepath.Join(t.TempDir(), "missing")); got != "" {
		t.Fatalf("missing result: %s", got)
	}
}
