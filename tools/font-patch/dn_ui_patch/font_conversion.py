"""Convert static CFF OpenType outlines to quadratic TrueType outlines."""
from io import BytesIO
import struct

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.roundTools import otRound
from fontTools.ttLib import TTFont, TTLibError, newTable

from .archive import PatchError, digest


def prepare_ttf(data: bytes) -> tuple[bytes, dict]:
    if data[:4] == b"\x00\x01\x00\x00":
        return data, {"performed": False, "input_format": "TrueType", "input_sha256": digest(data)}
    if data[:4] != b"OTTO":
        raise PatchError("仅支持单字体 TTF 或静态 CFF OTF，不支持 TTC/WOFF")
    try:
        with TTFont(BytesIO(data), checkChecksums=2, recalcTimestamp=False) as font:
            for tag in font.reader.keys():
                font.reader[tag]
            if "CFF " not in font or any(t in font for t in ("CFF2", "fvar", "VORG")):
                raise PatchError("仅支持静态 CFF OTF，暂不支持可变字体、CFF2 或 VORG")
            order = font.getGlyphOrder()
            if len(order) > 65535:
                raise PatchError("字形数超出 TrueType 限制")
            cmap = dict(font.getBestCmap() or {})
            horizontal = dict(font["hmtx"].metrics)
            vertical = dict(font["vmtx"].metrics) if "vmtx" in font else None
            names = [(r.nameID, r.platformID, r.platEncID, r.langID, bytes(r.string)) for r in font["name"].names]
            units_per_em = font["head"].unitsPerEm
            max_error = units_per_em / 1000
            glyph_set = font.getGlyphSet()
            glyphs = {}
            vertical_origins = {}
            for name in order:
                pen = TTGlyphPen(glyph_set)
                converter = Cu2QuPen(pen, max_error, reverse_direction=True, all_quadratic=True)
                glyph_set[name].draw(converter)
                glyphs[name] = pen.glyph()
                if vertical is not None:
                    bounds = BoundsPen(glyph_set)
                    glyph_set[name].draw(bounds)
                    vertical_origins[name] = (otRound(bounds.bounds[3]) if bounds.bounds else 0) + vertical[name][1]
            del font["CFF "]
            if "DSIG" in font:
                del font["DSIG"]
            font.sfntVersion = "\x00\x01\x00\x00"
            font["glyf"] = newTable("glyf")
            font["glyf"].glyphs = glyphs
            font["glyf"].glyphOrder = order
            # TTF bounding boxes include quadratic control points. CFF sidebearings
            # cannot be copied verbatim: the TTF loader would translate the outline.
            for name in order:
                glyphs[name].recalcBounds(font["glyf"])
                font["hmtx"].metrics[name] = (horizontal[name][0], glyphs[name].xMin)
                if vertical is not None:
                    font["vmtx"].metrics[name] = (vertical[name][0], vertical_origins[name] - glyphs[name].yMax)
            converted_horizontal = dict(font["hmtx"].metrics)
            converted_vertical = dict(font["vmtx"].metrics) if vertical is not None else None
            font["loca"] = newTable("loca")
            font["maxp"] = newTable("maxp")
            font["maxp"].tableVersion = 0x00010000
            font["maxp"].numGlyphs = len(order)
            font["maxp"].maxZones = 1
            for field in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
                          "maxStackElements", "maxSizeOfInstructions"):
                setattr(font["maxp"], field, 0)
            # Keep glyph names so cmap/layout/metric verification is exact after reload.
            font["post"].formatType = 2.0
            font["post"].extraNames = []
            font["post"].mapping = {}
            font.setGlyphOrder(order)
            output = BytesIO()
            font.save(output)
            converted = output.getvalue()
        with TTFont(BytesIO(converted), checkChecksums=2) as result:
            for tag in result.reader.keys():
                result.reader[tag]
            result_names = [(r.nameID, r.platformID, r.platEncID, r.langID, bytes(r.string)) for r in result["name"].names]
            if (result.getGlyphOrder() != order or result.getBestCmap() != cmap
                    or result["hmtx"].metrics != converted_horizontal
                    or (vertical is not None and result["vmtx"].metrics != converted_vertical)
                    or sorted(names) != sorted(result_names)):
                raise PatchError("OTF 转换后字形、字符映射、名称或字宽校验失败")
            # Force every resulting outline to decompile as well.
            for name in order:
                result["glyf"][name]
        return converted, {
            "performed": True, "input_format": "OpenType CFF", "output_format": "TrueType glyf",
            "input_sha256": digest(data), "output_sha256": digest(converted),
            "glyph_count": len(order), "unicode_codepoints": len(cmap),
            "curve_error_font_units": max_error,
            "note": "曲线近似误差参数不包含最终整数坐标舍入；CFF hinting 不转换为 TrueType hinting。",
            "glyph_order_preserved": True, "cmap_preserved": True, "names_preserved": True,
            "horizontal_advances_preserved": True, "vertical_advances_preserved": vertical is not None,
            "sidebearings_recomputed_for_truetype": True,
        }
    except (TTLibError, AssertionError, KeyError, ValueError, IndexError, struct.error) as error:
        raise PatchError(f"OTF 转换失败：{error}") from None
