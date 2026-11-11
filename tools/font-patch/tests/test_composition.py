from io import BytesIO
from pathlib import Path
import json
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/font-patch'))
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from dn_ui_patch.archive import PatchError
from dn_ui_patch.font_composition import compose, matches
from dn_ui_patch.desktop import source_info, preview, build


def fixture(upem=1000, width=300, donor=False):
    pen = TTGlyphPen(None)
    pen.moveTo((50, 0)); pen.lineTo((50, 600)); pen.lineTo((width, 600)); pen.lineTo((width, 0)); pen.closePath()
    glyph = pen.glyph()
    composite = TTGlyphPen({'shared': glyph})
    composite.addComponent('shared', (1, 0, 0, 1, 100, 0))
    b = FontBuilder(upem, isTTF=True)
    b.setupGlyphOrder(['.notdef', 'shared', 'composite', 'space'])
    b.setupCharacterMap({49: 'shared', 65: 'shared'} if donor else {49: 'shared', 50: 'shared', 65: 'shared', 0x4e2d: 'composite', 33: 'shared', 32: 'space'})
    b.setupGlyf({'.notdef': TTGlyphPen(None).glyph(), 'shared': glyph, 'composite': composite.glyph(), 'space': TTGlyphPen(None).glyph()})
    b.setupHorizontalMetrics({n: (upem, 50) for n in b.font.getGlyphOrder()})
    b.setupHorizontalHeader(ascent=800, descent=-200)
    b.setupNameTable({'familyName': 'CompositionTest', 'styleName': 'Regular'})
    b.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    b.setupPost()
    out=BytesIO();b.font.save(out);return out.getvalue()


def geometry(font, cp):
    name=font.getBestCmap()[cp]
    return list(font['glyf'][name].getCoordinates(font['glyf'])[0]), font['hmtx'].metrics[name]


class CompositionTests(unittest.TestCase):
    def test_categories(self):
        for char, scope in [('1',1),('１',1),('①',1),('A',2),('ｚ',2),('中',4),('𠀀',4),('！',8),('$',8)]:
            self.assertTrue(matches(ord(char),scope),char)
        self.assertFalse(matches(ord('中'),2))
        self.assertFalse(matches(ord(' '),15))
        self.assertTrue(matches(ord(' '),16))

    def test_replacement_isolated_from_aliases_and_composites(self):
        original=fixture();donor=fixture(2000,900,True)
        data,stats=compose(original,donor,1,0)
        self.assertEqual(stats,{'replaced':1,'adjusted':0,'fallback':1})
        with TTFont(BytesIO(original)) as before, TTFont(BytesIO(data)) as after:
            for cp in (65,0x4e2d,33,32,50):
                self.assertEqual(geometry(before,cp),geometry(after,cp))
            self.assertNotEqual(geometry(before,49),geometry(after,49))
            self.assertEqual(after['glyf'][after.getBestCmap()[49]].xMax,450)
            self.assertEqual(after['hhea'].ascent,before['hhea'].ascent)
            self.assertEqual(after['head'].unitsPerEm,1000)
            self.assertEqual(after.getBestCmap()[65],before.getBestCmap()[65])

    def test_adjustment_scope_is_independent_and_repeatable(self):
        original=fixture();donor=fixture(2000,900,True)
        plain,_=compose(original,donor,1,0)
        data,stats=compose(original,donor,1,2,110,2)
        self.assertEqual(stats['adjusted'],1)
        with TTFont(BytesIO(plain)) as before, TTFont(BytesIO(data)) as after:
            for cp in (49,50,0x4e2d,33):self.assertEqual(geometry(before,cp),geometry(after,cp))
            self.assertNotEqual(geometry(before,65),geometry(after,65))
        self.assertEqual(compose(original,donor,1,2,110,2)[0],data)
        self.assertEqual(compose(original,donor,0,0)[0],original)

    def test_no_matching_donor_and_invalid_scope(self):
        for replacement,adjustment in [(4,0),(17,0),(0,-1)]:
            with self.assertRaises(PatchError):compose(fixture(),fixture(donor=True),replacement,adjustment)

    def test_composition_preview_and_pack_exact_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            original=fixture()
            source=root/'source.ttf';source.write_bytes(original)
            self.assertEqual(source_info(source)['counts']['numbers'],2)
            data,_=compose(original,fixture(donor=True),1,4,110,0)
            merged=root/'combined.ttf';merged.write_bytes(data)
            draft=preview(merged,root/'preview')
            result=build(merged,root/'packed',0,expected_sha256=draft['sha256'])
            self.assertEqual(result['sha256'],draft['sha256'])
            self.assertEqual(source.read_bytes(),original)

if __name__=='__main__':unittest.main()
