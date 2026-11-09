import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from font_runtime_archive import MANIFEST, write_runtime_archive


class RuntimeArchiveTests(unittest.TestCase):
    def test_duplicate_bytes_and_framework_aliases_are_stored_once(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dist = root / "dist"
            dist.mkdir()
            (dist / "Python").write_bytes(b"runtime binary")
            (dist / "Python").chmod(0o755)
            (dist / "copy").write_bytes(b"runtime binary")
            (dist / "copy").chmod(0o755)
            (dist / "nonexecutable").write_bytes(b"runtime binary")
            aliases = {"copy"}
            stored = {"Python", "nonexecutable", MANIFEST}
            if os.name != "nt":  # Windows bundles do not use framework symlinks.
                (dist / "framework").mkdir()
                (dist / "framework" / "Python").symlink_to("../Python")
                (dist / "Current").symlink_to("framework", target_is_directory=True)
                aliases.update({"framework/Python", "Current/Python"})
            else:  # Windows chmod cannot distinguish executable permissions.
                aliases.add("nonexecutable")
                stored.remove("nonexecutable")
            archive = root / "runtime.zip"
            write_runtime_archive(dist, archive)
            with zipfile.ZipFile(archive) as zipped:
                self.assertEqual(set(zipped.namelist()), stored)
                manifest = json.loads(zipped.read(MANIFEST))
                self.assertEqual(manifest["version"], 1)
                self.assertEqual({e["path"] for e in manifest["duplicates"]}, aliases)
                self.assertEqual({e["source"] for e in manifest["duplicates"]}, {"Python"})

    @unittest.skipIf(os.name == "nt", "macOS framework symlinks only")
    def test_external_symlink_is_not_packaged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dist = root / "dist"
            dist.mkdir()
            (root / "outside").write_bytes(b"do not package")
            (dist / "link").symlink_to("../outside")
            with self.assertRaises(ValueError):
                write_runtime_archive(dist, root / "runtime.zip")

    @unittest.skipIf(os.name == "nt", "macOS framework symlinks only")
    def test_directory_symlinks_cannot_escape_or_cycle(self):
        for target in ("..", "."):
            with self.subTest(target=target), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                dist = root / "dist"
                dist.mkdir()
                (dist / "link").symlink_to(target, target_is_directory=True)
                with self.assertRaises(ValueError):
                    write_runtime_archive(dist, root / "runtime.zip")

    def test_go_embeds_only_matching_architecture_even_with_all_bundles_present(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "go.mod").write_text("module bundle-test\n\ngo 1.24\n")
            for source in (ROOT / "internal/platform/fontpatch").glob("bundle_*.go"):
                (root / source.name).write_bytes(source.read_bytes())
            (root / "runtime").mkdir()
            (root / "runtime/README.txt").write_text("unsupported")
            supported = {"darwin-arm64", "darwin-amd64", "windows-amd64"}
            for target in supported:
                for extension in ("txt", "zip"):
                    (root / "runtime" / f"{target}.{extension}").write_text(target)
            for target in sorted(supported | {"linux-amd64", "windows-arm64"}):
                with self.subTest(target=target):
                    system, arch = target.split("-")
                    env = {**os.environ, "GOOS": system, "GOARCH": arch, "CGO_ENABLED": "0", "GOWORK": "off"}
                    result = subprocess.run(["go", "list", "-json", "."], cwd=root, env=env,
                                            check=True, capture_output=True, text=True)
                    files = json.loads(result.stdout)["EmbedFiles"]
                    expected = ([f"runtime/{target}.txt", f"runtime/{target}.zip"]
                                if target in supported else ["runtime/README.txt"])
                    self.assertEqual(files, expected)


if __name__ == "__main__":
    unittest.main()
