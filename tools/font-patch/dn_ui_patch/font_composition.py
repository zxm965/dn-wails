"""Compose selected Unicode characters without mutating shared base glyphs."""
from array import array
import ctypes as C
from pathlib import Path
from io import BytesIO
import unicodedata

from fontTools.misc.roundTools import otRound
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program

from .archive import PatchError
from .font_adjustment import validate_options
from .font_conversion import prepare_ttf
from .font_metadata import describe_font, read_font


def validate_scope(scope):
    if type(scope) is not int or not 0 <= scope <= 16:
        raise PatchError("字符范围无效")


def matches(cp, scope):
    if scope == 16:
        return True
    char = chr(cp)
    category = unicodedata.category(char)
    if category.startswith('N'):
        return bool(scope & 1)
    if 65 <= cp <= 90 or 97 <= cp <= 122 or 0xFF21 <= cp <= 0xFF3A or 0xFF41 <= cp <= 0xFF5A:
        return bool(scope & 2)
    if unicodedata.name(char, '').startswith(('CJK UNIFIED IDEOGRAPH', 'CJK COMPATIBILITY IDEOGRAPH')):
        return bool(scope & 4)
    return bool(scope & 8 and category[0] in 'PS')



def compose(base_data, donor_data, replacement_scope, adjustment_scope, scale=100, weight=0):
    validate_scope(replacement_scope)
    validate_scope(adjustment_scope)
    validate_options(scale, weight)
    if replacement_scope and donor_data is None:
        raise PatchError("请选择用于替换的字体文件，或关闭替换范围")
    base_data, _ = prepare_ttf(base_data)
    describe_font(base_data)
    if donor_data is not None:
        donor_data, _ = prepare_ttf(donor_data)
        describe_font(donor_data)
    fonts = []
    def load(data):
        f = TTFont(BytesIO(data), recalcTimestamp=False)
        fonts.append(f)
        return f
    try:
        base = load(base_data)
        donor = load(donor_data) if donor_data is not None else None
        cmap = dict(base.getBestCmap())
        donor_cmap = donor.getBestCmap() if donor else {}
        # Glyph zero is not a supported character; retain the base in that case.
        donor_cmap = {cp: name for cp, name in donor_cmap.items() if donor.getGlyphID(name) != 0}
        candidates = sorted(set(cmap) | {cp for cp in donor_cmap if matches(cp, replacement_scope)})
        changed_options = scale != 100 or weight != 0
        ft = None
        if adjustment_scope and weight:
            import freetype
            bundled = Path(freetype.__file__).parent / freetype.raw.library_name
            if not bundled.is_file() or Path(freetype.raw._lib._name).resolve() != bundled.resolve():
                raise PatchError("内置字形调整组件缺失，请使用完整安装包")
            ft = freetype.raw._lib
            ft.FT_Outline_EmboldenXY.argtypes = [C.POINTER(freetype.FT_Outline), C.c_long, C.c_long]
            ft.FT_Outline_EmboldenXY.restype = C.c_int
            ft.FT_Outline_Check.argtypes = [C.POINTER(freetype.FT_Outline)]
            ft.FT_Outline_Check.restype = C.c_int
        new_cmap, order = dict(cmap), base.getGlyphOrder()[:]
        upem = base['head'].unitsPerEm
        reused, replacements, adjustments, fallback = {}, 0, 0, 0
        for cp in candidates:
            replace = matches(cp, replacement_scope) and cp in donor_cmap
            adjust = changed_options and matches(cp, adjustment_scope)
            if matches(cp, replacement_scope) and cp in cmap and cp not in donor_cmap:
                fallback += 1
            if not replace and not adjust:
                continue
            source_font = donor if replace else base
            source_name = donor_cmap[cp] if replace else cmap[cp]
            if source_font.getGlyphID(source_name) == 0:
                continue
            key = (replace, adjust, source_name)
            if key not in reused:
                if len(order) >= 65535:
                    raise PatchError("合并后字形数量超出 TrueType 上限，请缩小字符范围")
                name = f'dnw{len(order)}'
                while name in base['glyf'].glyphs:
                    name += '_'
                source_glyph = source_font['glyf'][source_name]
                coords, ends, flags = source_glyph.getCoordinates(source_font['glyf'])
                factor = upem / source_font['head'].unitsPerEm * (scale / 100 if adjust else 1)
                strength = otRound(weight * .005 * upem * 64) if adjust else 0
                target = Glyph()
                target.numberOfContours = len(ends)
                if coords:
                    if len(coords) > 32767 or len(ends) > 32767:
                        raise PatchError('选中字形点数超出兼容范围')
                    if strength:
                        points = (freetype.FT_Vector * len(coords))(*(freetype.FT_Vector(otRound(x * factor * 64), otRound(y * factor * 64)) for x, y in coords))
                        tags = (C.c_ubyte * len(coords))(*(int(f & 1) for f in flags))
                        contours = (C.c_short * len(ends))(*ends)
                        outline = freetype.FT_Outline(len(ends), len(coords), points, tags, contours, 0)
                        if ft.FT_Outline_Check(C.byref(outline)) or ft.FT_Outline_EmboldenXY(C.byref(outline), strength, strength):
                            raise PatchError('选中字形粗细调整失败')
                        target.coordinates = GlyphCoordinates([(otRound((p.x - strength / 2) / 64), otRound((p.y - strength / 2) / 64)) for p in points])
                    else:
                        target.coordinates = GlyphCoordinates([(otRound(x * factor), otRound(y * factor)) for x, y in coords])
                    if any(not -32768 <= n <= 32767 for point in target.coordinates for n in point):
                        raise PatchError("合并字形超出坐标范围，请减小字号")
                    target.endPtsOfContours = list(ends)
                    target.flags = array('B', (f & 1 for f in flags))
                    target.program = Program()
                    target.program.fromBytecode([])
                    target.recalcBounds(base['glyf'])
                    if strength < 0 and (target.xMax <= target.xMin or target.yMax <= target.yMin):
                        raise PatchError('减细后字形过窄，请降低减细程度')
                base['glyf'].glyphs[name] = target
                advance, bearing = source_font['hmtx'].metrics[source_name]
                advance = otRound(advance * factor) + (otRound(strength / 64) if advance and coords else 0)
                if not 0 <= advance <= 65535:
                    raise PatchError("合并字形字宽超出范围")
                base['hmtx'].metrics[name] = (advance, target.xMin if coords else otRound(bearing * factor))
                if 'vmtx' in base:
                    advance, top = source_font['vmtx'].metrics[source_name] if 'vmtx' in source_font else (source_font['head'].unitsPerEm, 0)
                    base['vmtx'].metrics[name] = (otRound(advance * factor), otRound(top * factor))
                order.append(name)
                reused[key] = name
            new_cmap[cp] = reused[key]
            replacements += int(replace)
            adjustments += int(adjust)
        stats = {'replaced': replacements, 'adjusted': adjustments, 'fallback': fallback}
        if replacement_scope and replacements == 0:
            raise PatchError("替换字体不包含所选类型的有效字符，请更换字体或调整范围")
        if not reused:
            return base_data, stats
        base.setGlyphOrder(order)
        # Preserve original glyphs: unselected composite glyphs and aliases can
        # still refer to them. Only Unicode mappings for chosen characters change.
        for table in base['cmap'].tables:
            if table.isUnicode() and table.format in (4, 12, 13):
                table.cmap = {cp: name for cp, name in new_cmap.items() if table.format != 4 or cp < 0xFFFF}
            elif table.isUnicode() and hasattr(table, 'cmap'):
                table.cmap = {cp: new_cmap.get(cp, name) for cp, name in table.cmap.items()}
        if any(cp >= 0xFFFF for cp in new_cmap) and not any(t.format == 12 and t.isUnicode() for t in base['cmap'].tables):
            table = CmapSubtable.newSubtable(12)
            table.platformID, table.platEncID, table.language = 3, 10, 0
            table.cmap = new_cmap
            base['cmap'].tables.append(table)
        # Device-metric arrays depend on glyph count. Base hint programs stay
        # available to untouched glyphs; imported glyphs have no hint program.
        for tag in ('DSIG', 'hdmx', 'VDMX', 'LTSH'):
            if tag in base:
                del base[tag]
        out = BytesIO()
        base.save(out)
        data = out.getvalue()
        if len(data) > 64 * 1024 * 1024:
            raise PatchError("合并字体超过 64 MiB")
        describe_font(data)
        return data, stats
    finally:
        for f in fonts:
            f.close()


def merge_request(request):
    from pathlib import Path
    data, stats = compose(read_font(Path(request['base'])), read_font(Path(request['donor'])) if request.get('donor') else None,
                          request['replacementScope'], request['adjustmentScope'], request['options']['scalePercent'], request['options']['weight'])
    output = Path(request['output'])
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as file:
        file.write(data)
    return stats
