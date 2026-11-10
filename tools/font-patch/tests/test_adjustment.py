from io import BytesIO
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/font-patch"))
import unittest

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

from dn_ui_patch.archive import PatchError
from dn_ui_patch.font_adjustment import adjust_font
from dn_ui_patch.desktop import preview, build


class FontAdjustmentTests(unittest.TestCase):
    def test_geometry_metrics_and_composite_survive_roundtrip(self):
        pen = TTGlyphPen(None)
        pen.moveTo((100, 0))
        pen.lineTo((100, 700))
        pen.lineTo((500, 700))
        pen.lineTo((500, 0))
        pen.closePath()
        base = pen.glyph()
        composite = TTGlyphPen({"box": base})
        composite.addComponent("box", (1, 0, 0, 1, 100, 0))
        builder = FontBuilder(1000, isTTF=True)
        builder.setupGlyphOrder([".notdef", "box", "composite", "space"])
        builder.setupCharacterMap({65: "box", 66: "composite", 32: "space"})
        builder.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "box": base,
                           "composite": composite.glyph(), "space": TTGlyphPen(None).glyph()})
        builder.setupHorizontalMetrics({".notdef": (500, 0), "box": (600, 100),
                                        "composite": (700, 200), "space": (250, 0)})
        builder.setupHorizontalHeader(ascent=800, descent=-200)
        builder.setupNameTable({"familyName": "TrialTest", "styleName": "Regular"})
        builder.setupOS2(usWeightClass=400, sTypoAscender=800, sTypoDescender=-200,
                        usWinAscent=800, usWinDescent=200)
        builder.setupPost()
        buf = BytesIO()
        builder.font.save(buf)
        result, report = adjust_font(buf.getvalue(), 110, 2)
        with TTFont(BytesIO(result)) as f:
            g = f["glyf"]["box"]
            # Scaling alone would produce 110..550 and 0..770. Verify actual
            # contour growth, not merely a weight label or scaled coordinates.
            self.assertLess(g.xMin, 110)
            self.assertGreater(g.xMax, 550)
            self.assertLess(g.yMin, 0)
            self.assertGreater(g.yMax, 770)
            self.assertEqual(f["hmtx"].metrics["box"][0], 670)
            self.assertEqual(f["hmtx"].metrics["box"][1], g.xMin)
            self.assertFalse(f["glyf"]["composite"].isComposite())
            self.assertEqual(f["glyf"]["composite"].xMin - g.xMin, 110)
            self.assertEqual(f["glyf"]["space"].numberOfContours, 0)
            self.assertEqual(f["hmtx"].metrics["space"][0], 275)
            self.assertEqual(f["head"].unitsPerEm, 1000)
            self.assertEqual(f["hhea"].ascent, 800)
            self.assertEqual(f["OS/2"].usWeightClass, 400)
            self.assertEqual(f.getBestCmap(), {65: "box", 66: "composite", 32: "space"})
        self.assertFalse(report["exact_ui_plus_2px"])
        self.assertFalse(report["designer_medium_master"])

    def test_excessive_transformation_is_rejected_before_reading_font(self):
        with self.assertRaises(PatchError):
            adjust_font(b"", scale_percent=200)

    def test_default_is_byte_exact_and_ranges_are_checked(self):
        original = (ROOT / "internal/platform/fontpatch/testdata/synthetic.ttf").read_bytes()
        self.assertEqual(adjust_font(original)[0], original)
        for scale, weight in ((79, 0), (126, 0), (100, -3), (100, 7), (True, 0), (100, 1.5)):
            with self.assertRaises(PatchError):
                adjust_font(original, scale, weight)

    def test_preview_never_packages_and_confirmation_requires_same_digest(self):
        source = ROOT / "internal/platform/fontpatch/testdata/synthetic.otf"
        options = {"scalePercent": 115, "weight": 2}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = preview(source, root / "preview", options)
            self.assertTrue(result["adjusted"])
            self.assertEqual(list(root.rglob("*.pak")), [])
            self.assertEqual(list(root.rglob("*.zip")), [])
            with self.assertRaises(PatchError):
                build(source, root / "bad", 0, options, "wrong")
            self.assertFalse((root / "bad").exists())
            packed = build(source, root / "confirmed", 0, options, result["sha256"])
            self.assertEqual(packed["sha256"], result["sha256"])

    def test_thinning_and_size_only_change_geometry(self):
        original = (ROOT / "internal/platform/fontpatch/testdata/synthetic.ttf").read_bytes()
        for scale, weight in ((80, 0), (125, 0), (100, -2), (100, 6)):
            with self.subTest(scale=scale, weight=weight):
                data, report = adjust_font(original, scale, weight)
                self.assertNotEqual(data, original)
                self.assertTrue(report["performed"])
                with TTFont(BytesIO(data)) as font:
                    self.assertEqual(font.getBestCmap(), {65: "A"})
                    font["glyf"]["A"].getCoordinates(font["glyf"])


if __name__ == "__main__":
    unittest.main()
