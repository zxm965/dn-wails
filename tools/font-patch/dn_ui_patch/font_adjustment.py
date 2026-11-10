"""Adjust static glyph outlines with the bundled FreeType, retaining nominal sizing."""
from array import array
import ctypes as C
from io import BytesIO
from pathlib import Path

from fontTools.misc.roundTools import otRound
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program

from .archive import PatchError, digest


def validate_options(scale_percent, weight):
    if type(scale_percent) is not int or not 80 <= scale_percent <= 125:
        raise PatchError("字形大小须在 80%–125% 之间")
    if type(weight) is not int or not -2 <= weight <= 6:
        raise PatchError("笔画粗细须在 -2–6 档之间")


def adjust_font(data: bytes, scale_percent: int = 100, weight: int = 0):
    validate_options(scale_percent, weight)
    if scale_percent == 100 and weight == 0:
        return data, {"performed": False, "scalePercent": 100, "weight": 0}
    scale = scale_percent / 100
    strength_em = weight * .005
    import freetype
    # Never fall back to a user's system FreeType installation.
    bundled = Path(freetype.__file__).parent / freetype.raw.library_name
    if not bundled.is_file() or Path(freetype.raw._lib._name).resolve() != bundled.resolve():
        raise PatchError("内置字形调整组件缺失，请使用完整安装包")
    ft = freetype.raw._lib
    Vector, Outline = freetype.FT_Vector, freetype.FT_Outline
    ft.FT_Outline_EmboldenXY.argtypes = [C.POINTER(Outline), C.c_long, C.c_long]
    ft.FT_Outline_EmboldenXY.restype = C.c_int
    ft.FT_Outline_Check.argtypes = [C.POINTER(Outline)]
    ft.FT_Outline_Check.restype = C.c_int
    with TTFont(BytesIO(data), recalcTimestamp=False, checkChecksums=2) as font:
        if "glyf" not in font or "fvar" in font:
            raise PatchError("试用工具仅支持静态 TrueType glyf 字体")
        if any(t in font for t in ("COLR", "SVG ", "CBDT", "sbix", "CFF2")):
            raise PatchError("暂不支持彩色或混合轮廓字体")
        upem = font["head"].unitsPerEm
        cmap = dict(font.getBestCmap())
        order = font.getGlyphOrder()
        original_names = font["name"].compile(font)
        original_weight = font["OS/2"].usWeightClass
        # Keep nominal font sizing/line metrics; enlarge geometry and advance
        # widths, including GPOS coordinates, using fontTools' table visitor.
        line_fields = {"hhea": ("ascent", "descent", "lineGap"),
                       "OS/2": ("sTypoAscender", "sTypoDescender", "sTypoLineGap",
                                "usWinAscent", "usWinDescent")}
        if "vhea" in font:
            line_fields["vhea"] = ("ascent", "descent", "lineGap")
        original_lines = {t: {k: getattr(font[t], k) for k in fields}
                          for t, fields in line_fields.items()}
        new_upem = otRound(upem * scale)
        actual_scale = new_upem / upem
        scale_upem(font, new_upem)
        font["head"].unitsPerEm = upem
        for table, fields in original_lines.items():
            for name, value in fields.items():
                setattr(font[table], name, value)
        glyf = font["glyf"]
        strength = otRound(strength_em * upem * 64)
        changed, glyphs = 0, {}
        for name in order:
            source = glyf[name]
            coords, ends, flags = source.getCoordinates(glyf)
            if len(coords) > 32767 or len(ends) > 32767:
                raise PatchError("字形点数超出本工具兼容范围")
            target = Glyph()
            target.numberOfContours = len(ends)
            if coords:
                # 26.6 precision in design space; no face/size initialization
                # is needed for FreeType's standalone outline operation.
                points = (Vector * len(coords))(*(Vector(otRound(x * 64), otRound(y * 64)) for x, y in coords))
                tags = (C.c_ubyte * len(coords))(*(int(f & 1) for f in flags))
                contours = (C.c_short * len(ends))(*ends)
                outline = Outline(len(ends), len(coords), points, tags, contours, 0)
                if ft.FT_Outline_Check(C.byref(outline)) or (strength and ft.FT_Outline_EmboldenXY(C.byref(outline), strength, strength)):
                    raise PatchError(f"字形加粗失败：{name}")
                # Center the added stroke instead of shifting it up/right.
                target.coordinates = GlyphCoordinates(
                    [(otRound((p.x - strength / 2) / 64), otRound((p.y - strength / 2) / 64)) for p in points])
                if any(not -32768 <= v <= 32767 for xy in target.coordinates for v in xy):
                    raise PatchError("字形超出 TrueType 坐标范围")
                target.endPtsOfContours = list(ends)
                target.flags = array("B", (f & 1 for f in flags))
                target.program = Program()
                target.program.fromBytecode([])
                target.recalcBounds(glyf)
                if strength < 0 and (target.xMax <= target.xMin or target.yMax <= target.yMin):
                    raise PatchError("减细后字形过窄，请降低减细程度")
                advance, _ = font["hmtx"].metrics[name]
                font["hmtx"].metrics[name] = (advance + (otRound(strength / 64) if advance else 0), target.xMin)
                if "vmtx" in font:
                    source.recalcBounds(glyf)
                    vadvance, top = font["vmtx"].metrics[name]
                    font["vmtx"].metrics[name] = (vadvance, source.yMax + top - target.yMax)
                changed += 1
            glyphs[name] = target
        glyf.glyphs = glyphs
        # Original hint programs and device metrics are stale after geometry edits.
        for table in ("fpgm", "prep", "cvt ", "hdmx", "VDMX", "LTSH", "DSIG"):
            if table in font:
                del font[table]
        if "gasp" in font:
            font["gasp"].gaspRange = {65535: 10}  # grayscale + symmetric smoothing
        font["head"].flags &= ~0x10  # advance width no longer modified by instructions
        font["OS/2"].usWeightClass = original_weight
        out = BytesIO()
        font.save(out)
        result = out.getvalue()
    with TTFont(BytesIO(result), checkChecksums=2) as check:
        for tag in check.reader.keys():
            check.reader[tag]
        assert check.getBestCmap() == cmap and check.getGlyphOrder() == order
        assert check["name"].compile(check) == original_names
        for name in order:
            check["glyf"][name].getCoordinates(check["glyf"])
        for table, fields in original_lines.items():
            assert all(getattr(check[table], k) == v for k, v in fields.items())
    return result, {
        "performed": True, "scalePercent": scale_percent, "weight": weight, "source_sha256": digest(data), "output_sha256": digest(result),
        "source_weight_class": original_weight, "output_weight_class": original_weight,
        "designer_medium_master": False, "scale": actual_scale,
        "stroke_expansion_em": strength / 64 / upem,
        "glyphs_processed": changed, "glyph_count": len(order), "cmap_preserved": True,
        "font_names_preserved": True, "upem_and_line_metrics_preserved": True,
        "original_hinting_removed": True, "exact_ui_plus_2px": False, "game_verified": False,
        "note": "人工调整轮廓和字形比例，不改变游戏界面字号设置；固定控件可能裁切或重叠，游戏效果需实测。"
    }
