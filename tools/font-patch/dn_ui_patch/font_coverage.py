"""Desktop character coverage, based on real Unicode cmap entries (not fallback)."""
import encodings.gbk  # Keep the GBK codec and its native module in frozen builds.
from functools import lru_cache
from io import BytesIO
from fontTools.ttLib import TTFont


@lru_cache(maxsize=1)
def gbk_codepoints() -> frozenset[int]:
    # Printable ASCII plus all assigned two-byte characters of Python's GBK
    # mapping. Controls, invalid byte sequences and GB18030-only characters are
    # excluded; this tests cmap coverage, not the font file's byte encoding.
    points = set(range(0x20, 0x7F))
    for lead in range(0x81, 0xFF):
        for trail in range(0x40, 0xFF):
            if trail == 0x7F:
                continue
            try:
                points.add(ord(bytes((lead, trail)).decode('gbk')))
            except UnicodeDecodeError:
                pass
    return frozenset(points)


def summarize_coverage(codepoints) -> dict:
    target = gbk_codepoints()
    missing = sorted(target.difference(codepoints))
    return {"total": len(target), "covered": len(target) - len(missing),
            "missing": len(missing), "missingSample": ''.join(map(chr, missing[:24]))}


def inspect_coverage(data: bytes):
    with TTFont(BytesIO(data), lazy=True) as font:
        count = font['maxp'].numGlyphs
        codepoints = sorted(cp for cp, name in (font.getBestCmap() or {}).items()
                            if 0 <= cp <= 0x10FFFF and not 0xD800 <= cp <= 0xDFFF
                            and 0 < font.getGlyphID(name) < count)
    return summarize_coverage(codepoints), codepoints
