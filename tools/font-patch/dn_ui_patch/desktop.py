"""Source-free, single-font desktop build using the verified CN font profile.

This profile is the v11, zlib, zero-reserved single-resource layout observed in
00Resourceimpfont.pak (SHA256 b152cc52b934010aaaa3bee0c667925b5517029cd837164503060cb7f44bfbe3).
No original font, game asset, key or local download path is distributed.
"""
from pathlib import Path
import json
import re
import sys
import zlib

from .archive import Archive, Entry, PatchError, digest, write_archive
from .font_conversion import prepare_ttf
from .font_metadata import describe_font, read_font
from .build_output import publish_build
from .font_adjustment import adjust_font, validate_options
from .font_coverage import inspect_coverage
from .font_composition import merge_request, matches

FONT_PATH = "resource/fonts/mysh.ttf"


def prepare(source: Path, options=None):
    options = options or {}
    scale, weight = options.get("scalePercent", 100), options.get("weight", 0)
    validate_options(scale, weight)
    if source.suffix.lower() not in (".ttf", ".otf") or not source.is_file():
        raise PatchError("请选择 TTF 或静态 CFF OTF 字体文件")
    original = read_font(source)
    data, conversion = prepare_ttf(original)
    describe_font(data)  # Reject unsupported fonts before modifying outlines.
    data, adjustment = adjust_font(data, scale, weight)
    if len(data) > 64 * 1024 * 1024:
        raise PatchError("转换后字体不能超过 64 MiB")
    metadata = describe_font(data)
    return original, data, conversion, adjustment, metadata


def preview(source: Path, output: Path, options=None) -> dict:
    _, data, conversion, adjustment, metadata = prepare(source, options)
    output.mkdir(parents=True, exist_ok=False)
    font = output / "preview.ttf"
    font.write_bytes(data)
    coverage, codepoints = inspect_coverage(data)
    (output / "coverage.json").write_text(json.dumps(codepoints), encoding="utf-8")
    names = metadata["names"]
    return {"fontName": (names.get("4") or names.get("1") or [source.stem])[0],
            "sourceName": source.name, "fontPath": str(font.resolve()),
            "converted": conversion["performed"], "adjusted": adjustment["performed"],
            "options": {"scalePercent": adjustment["scalePercent"], "weight": adjustment["weight"]},
            "missingCharacters": "".join(metadata["sample_missing_characters"]),
            "glyphCount": metadata["glyph_count"], "sha256": metadata["sha256"], "gbkCoverage": coverage}


def build(source: Path, output: Path, padding_mib: int = 500, options=None, expected_sha256="") -> dict:
    if output.exists():
        raise PatchError("构建目录已存在")
    original, data, conversion, adjustment, metadata = prepare(source, options)
    if expected_sha256 and metadata["sha256"] != expected_sha256:
        raise PatchError("预览字体已变化，请重新预览后确认")
    slug = re.sub(r"[^\w-]+", "-", source.stem, flags=re.UNICODE).strip("-_")[:60] or "font"
    filename = f"0dnResource-Font-{slug}.pak"
    stage = output / "stage"
    pak = stage / filename
    payload = zlib.compress(data, 9)
    entry = Entry(FONT_PATH, len(payload), len(data), len(payload), 1024)
    report = write_archive(pak, [(entry, payload)], padding_mib=padding_mib)
    archive = Archive(pak)
    stored = archive.entry(FONT_PATH)
    if zlib.decompress(archive.payload(stored)) != data:
        raise PatchError("封包后字体回读校验失败")
    coverage, codepoints = inspect_coverage(data)
    metadata["gbk_coverage"] = coverage
    report.update({"feature": "fonts", "font": metadata, "conversion": conversion,
                   "adjustment": adjustment,
                   "input_sha256": digest(original), "font_bytes_preserved": not conversion["performed"] and not adjustment["performed"],
                   "packaged_font_bytes_verified": True, "choose_one": True,
                   "exclusive_group": "main-font", "profile": "cn-mysh-zlib-v11"})
    if conversion["performed"] or adjustment["performed"]:
        converted = pak.with_suffix(".ttf")
        converted.write_bytes(data)
        report["converted_ttf"] = str(converted.resolve())
    Path(str(pak) + ".report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    published = publish_build(stage, output / "result", report, [source])
    stage.rmdir()
    (output / "coverage.json").write_text(json.dumps(codepoints), encoding="utf-8")
    result_pak = Path(published["output"])
    result_zip = Path(published["zip_files"][0])
    names = metadata["names"]
    return {"fontName": (names.get("4") or names.get("1") or [source.stem])[0],
            "sourceName": source.name, "filename": filename, "pakPath": str(result_pak),
            "zipPath": str(result_zip), "pakBytes": result_pak.stat().st_size,
            "zipBytes": result_zip.stat().st_size, "converted": conversion["performed"],
            "adjusted": adjustment["performed"],
            "options": {"scalePercent": adjustment["scalePercent"], "weight": adjustment["weight"]},
            "missingCharacters": "".join(metadata["sample_missing_characters"]),
            "glyphCount": metadata["glyph_count"], "sha256": metadata["sha256"],
            "containerVerified": True, "gameVerified": False, "gbkCoverage": coverage}


def source_info(path):
    data = read_font(Path(path))
    metadata = describe_font(data)
    coverage, points = inspect_coverage(data)
    (Path(path).parent / 'coverage.json').write_text(json.dumps(points), encoding='utf-8')
    counts = {name: sum(matches(cp, scope) for cp in points) for name, scope in [('numbers', 1), ('letters', 2), ('text', 4), ('symbols', 8)]}
    counts['other'] = len(points) - sum(counts.values())
    return {'sha256': metadata['sha256'], 'glyphCount': metadata['glyph_count'], 'gbkCoverage': coverage, 'counts': counts}


def main():
    try:
        request = json.loads(sys.stdin.buffer.read(65537))
        action = request.get("action")
        if action == 'import':
            data, _ = prepare_ttf(read_font(Path(request['source'])))
            describe_font(data)
            with Path(request['output']).open('xb') as file:
                file.write(data)
            result = source_info(request['output'])
        elif action == 'merge':
            result = merge_request(request)
        elif action == "preview":
            result = preview(Path(request["source"]), Path(request["output"]), request.get("options"))
        else:
            result = build(Path(request["source"]), Path(request["output"]), options=request.get("options"),
                           expected_sha256=request.get("expectedSHA256", ""))
        response = {"result": result, "error": ""}
    except Exception as error:
        response = {"error": str(error)[:2000] or "字体构建失败"}
    sys.stdout.buffer.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
    return 1 if response["error"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
