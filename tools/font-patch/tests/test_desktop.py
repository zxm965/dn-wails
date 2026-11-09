from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "font-patch"))
from dn_ui_patch.archive import Archive, PatchError
from dn_ui_patch.desktop import build, FONT_PATH
from fontTools.ttLib import TTFont, newTable

FIXTURES = ROOT / "internal" / "platform" / "fontpatch" / "testdata"


class DesktopTests(unittest.TestCase):
    def test_standalone_ttf_and_otf_preserve_inputs_and_verify_output(self):
        for suffix in ("ttf", "otf"):
            with self.subTest(suffix=suffix), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                source = root / f"中文 字体.{suffix}"
                original = (FIXTURES / f"synthetic.{suffix}").read_bytes()
                source.write_bytes(original)
                result = build(source, root / "out", 0)
                self.assertEqual(source.read_bytes(), original)
                self.assertEqual(result["converted"], suffix == "otf")
                self.assertFalse(result["gameVerified"])
                self.assertIn("龙", result["missingCharacters"])
                archive = Archive(result["pakPath"])
                self.assertEqual(set(archive.entries), {FONT_PATH})
                font = zlib.decompress(archive.payload(archive.entry(FONT_PATH)))
                if suffix == "ttf":
                    self.assertEqual(font, original)
                else:
                    self.assertEqual(font[:4], b"\0\1\0\0")
                with zipfile.ZipFile(result["zipPath"]) as zipped:
                    self.assertIsNone(zipped.testzip())
                    self.assertEqual(len(zipped.namelist()), 2)
                    report = json.loads(zipped.read(result["filename"] + ".report.json"))
                    self.assertTrue(report["packaged_font_bytes_verified"])

    def test_rejects_invalid_variable_and_oversized_fonts_before_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            malformed = root / "bad.ttf"
            malformed.write_bytes(b"invalid")
            oversized = root / "large.ttf"
            with oversized.open("wb") as stream:
                stream.truncate(64 * 1024 * 1024 + 1)
            variable = root / "variable.ttf"
            with TTFont(FIXTURES / "synthetic.ttf") as font:
                font["fvar"] = newTable("fvar")
                font["fvar"].axes = []
                font["fvar"].instances = []
                font.save(variable)
            for source in (malformed, oversized, variable):
                with self.subTest(source=source):
                    with self.assertRaises(PatchError):
                        build(source, root / "out", 0)
                    self.assertFalse((root / "out").exists())

    def test_worker_returns_utf8_json_errors(self):
        result = subprocess.run([sys.executable, str(ROOT / "tools/font-patch/worker.py")],
                                input=b"{}", capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 1)
        self.assertTrue(json.loads(result.stdout)["error"])

    def test_broken_name_encoding_uses_filename_without_rewriting_ttf(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "fallback.ttf"
            with TTFont(FIXTURES / "synthetic.ttf") as font:
                for record in font["name"].names:
                    record.platformID, record.platEncID, record.langID = 3, 1, 0x409
                    record.string = b"\xd8\x00"  # Unpaired UTF-16 high surrogate.
                font.save(source)
            before = source.read_bytes()
            result = build(source, root / "out", 0)
            self.assertEqual(result["fontName"], "fallback")
            archive = Archive(result["pakPath"])
            self.assertEqual(zlib.decompress(archive.payload(archive.entry(FONT_PATH))), before)


if __name__ == "__main__":
    unittest.main()
