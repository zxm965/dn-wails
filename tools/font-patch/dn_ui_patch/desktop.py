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

FONT_PATH = "resource/fonts/mysh.ttf"


def build(source: Path, output: Path, padding_mib: int = 500) -> dict:
    if source.suffix.lower() not in (".ttf", ".otf") or not source.is_file():
        raise PatchError("请选择 TTF 或静态 CFF OTF 字体文件")
    if output.exists():
        raise PatchError("构建目录已存在")
    original = read_font(source)
    data, conversion = prepare_ttf(original)
    if len(data) > 64 * 1024 * 1024:
        raise PatchError("转换后字体不能超过 64 MiB")
    metadata = describe_font(data)
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
    report.update({"feature": "fonts", "font": metadata, "conversion": conversion,
                   "input_sha256": digest(original), "font_bytes_preserved": not conversion["performed"],
                   "packaged_font_bytes_verified": True, "choose_one": True,
                   "exclusive_group": "main-font", "profile": "cn-mysh-zlib-v11"})
    if conversion["performed"]:
        converted = pak.with_suffix(".ttf")
        converted.write_bytes(data)
        report["converted_ttf"] = str(converted.resolve())
    Path(str(pak) + ".report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    published = publish_build(stage, output / "result", report, [source])
    stage.rmdir()
    result_pak = Path(published["output"])
    result_zip = Path(published["zip_files"][0])
    names = metadata["names"]
    return {"fontName": (names.get("4") or names.get("1") or [source.stem])[0],
            "sourceName": source.name, "filename": filename, "pakPath": str(result_pak),
            "zipPath": str(result_zip), "pakBytes": result_pak.stat().st_size,
            "zipBytes": result_zip.stat().st_size, "converted": conversion["performed"],
            "missingCharacters": "".join(metadata["sample_missing_characters"]),
            "glyphCount": metadata["glyph_count"], "sha256": metadata["sha256"],
            "containerVerified": True, "gameVerified": False}


def main():
    try:
        request = json.loads(sys.stdin.buffer.read(65537))
        result = build(Path(request["source"]), Path(request["output"]))
        response = {"result": result, "error": ""}
    except Exception as error:
        response = {"error": str(error)[:2000] or "字体构建失败"}
    sys.stdout.buffer.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
    return 1 if response["error"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
