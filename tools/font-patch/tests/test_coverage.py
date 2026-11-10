from io import BytesIO
from pathlib import Path
import sys
import unittest
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/font-patch'))
from fontTools.ttLib import TTFont
from dn_ui_patch.font_coverage import gbk_codepoints, inspect_coverage, summarize_coverage

class CoverageTests(unittest.TestCase):
    def test_gbk_scope_and_complete_coverage(self):
        points = gbk_codepoints()
        self.assertIn(ord('龙'), points)
        self.assertIn(ord('體'), points)
        self.assertIn(ord('A'), points)
        self.assertNotIn(ord('\n'), points)
        self.assertNotIn(ord('😀'), points)
        self.assertNotIn(ord('𠮷'), points)
        self.assertGreater(len(points), 21000)
        result = summarize_coverage(points)
        self.assertEqual(result['missing'], 0)
        self.assertEqual(result['total'], result['covered'])
        self.assertEqual(result['missingSample'], '')

    def test_missing_characters_and_notdef_mapping(self):
        data = (ROOT / 'internal/platform/fontpatch/testdata/synthetic.ttf').read_bytes()
        with TTFont(BytesIO(data)) as font:
            for table in font['cmap'].tables:
                if table.isUnicode():
                    table.cmap[ord('龙')] = font.getGlyphOrder()[0]
            output = BytesIO()
            font.save(output)
        result, points = inspect_coverage(output.getvalue())
        self.assertNotIn(ord('龙'), points)
        self.assertEqual(result['covered'] + result['missing'], result['total'])
        self.assertGreater(result['missing'], 0)
        self.assertLessEqual(len(result['missingSample']), 24)
        self.assertNotIn(ord('😀'), points)

if __name__ == '__main__': unittest.main()
