"""Shared static TrueType validation for CLI and desktop builds."""
from io import BytesIO
from pathlib import Path
import struct
from fontTools.ttLib import TTFont, TTLibError
from .archive import PatchError, digest

def describe_font(data: bytes) -> dict:
    if data[:4] != b"\x00\x01\x00\x00":
        raise PatchError("目前仅接受单字体 TrueType TTF，不支持 TTC、OTF 或 WOFF")
    try:
        with TTFont(BytesIO(data), checkChecksums=2) as font:
            for tag in font.reader.keys():
                font.reader[tag]  # Verify every table checksum, without rewriting.
            if not all(tag in font for tag in ("glyf", "name", "head", "maxp", "cmap", "OS/2")):
                raise PatchError("TTF 缺少所需字体表")
            if any(tag in font for tag in ("fvar", "CFF2", "COLR", "SVG ", "CBDT", "sbix")):
                raise PatchError("暂不支持可变字体或彩色字体，请下载静态 TTF/OTF")
            # Force all outlines and metrics to parse before packing.
            for name in font.getGlyphOrder():
                font["glyf"][name]
            font["hmtx"].metrics
            names = {}
            for record in font["name"].names:
                if record.nameID in (1, 2, 3, 4, 5, 6, 16, 17):
                    try:
                        text = record.toUnicode()
                    except (UnicodeError, LookupError):
                        # Bad display metadata must not prevent valid outlines
                        # from being packed; the desktop can use the filename.
                        continue
                    values = names.setdefault(str(record.nameID), [])
                    if text not in values:
                        values.append(text)
            cmap = font.getBestCmap()
            if not cmap:
                raise PatchError("TTF 没有可用 Unicode 字符映射")
            sample = "龙之谷营销字体调整简体中文繁體中文Aa0123456789，。！？"
            missing = list(dict.fromkeys(c for c in sample if ord(c) not in cmap))
            os2 = font["OS/2"]
            return {
                "sha256": digest(data), "bytes": len(data), "names": names,
                "glyph_count": font["maxp"].numGlyphs, "unicode_codepoints": len(cmap),
                "cjk_basic_codepoints": sum(0x4E00 <= cp <= 0x9FFF for cp in cmap),
                "units_per_em": font["head"].unitsPerEm,
                "weight_class": os2.usWeightClass,
                "sample_missing_characters": missing,
                "tables": list(font.reader.keys()),
            }
    except (TTLibError, AssertionError, KeyError, ValueError, IndexError, struct.error) as error:
        raise PatchError(f"字体结构或校验失败：{error}") from None


def read_font(path: Path) -> bytes:
    if path.stat().st_size > 64 * 1024 * 1024:
        raise PatchError("单个字体不能超过 64 MiB")
    return path.read_bytes()
