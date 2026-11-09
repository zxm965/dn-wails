"""Publish validated builds into stable package-named directories."""
import json
from pathlib import Path
import zipfile

from .archive import PatchError


def rewrite_paths(value, paths):
    if isinstance(value, dict):
        return {k: rewrite_paths(v, paths) for k, v in value.items()}
    if isinstance(value, list):
        return [rewrite_paths(v, paths) for v in value]
    return paths.get(value, value) if isinstance(value, str) else value


def publish_build(stage: Path, output: Path, result: dict, inputs: list[Path]):
    paks = sorted(stage.rglob("*.pak"))
    if not paks:
        raise PatchError("构建未产生 PAK")
    owners = {p.parent: p.stem for p in paks}
    if len(owners) != len(paks):
        raise PatchError("暂存目录内每个补丁必须独立存放")
    def destination(p):
        folder = output / owners[p.parent]
        return folder / "details" / p.name if p.suffix == ".ttf" else folder / p.name
    files = [p for p in stage.rglob("*") if p.is_file() and p.name != "manifest.json"]
    names = [p.name.casefold() for p in files] + [p.with_suffix(".zip").name.casefold() for p in paks]
    if len(names) != len(set(names)):
        raise PatchError("本批次输出文件名重复，请为输入字体使用不同文件名")
    protected = {p.resolve() for p in inputs}
    for p in files + [p.with_suffix(".zip") for p in paks]:
        dest = destination(p)
        if dest.parent.is_symlink() or (dest.parent.exists() and not dest.parent.is_dir()):
            raise PatchError(f"补丁输出目录不是普通目录：{dest.parent}")
        if dest.resolve() in protected:
            raise PatchError(f"输出会覆盖输入文件：{dest}")
        if dest.exists() and not dest.is_file():
            raise PatchError(f"输出路径不是普通文件：{dest}")
    paths = {str(p): str(destination(p)) for p in files}
    paths.update({str(p.resolve()): str(destination(p).resolve()) for p in files})
    for p in files:
        if p.suffix == ".json":
            data = rewrite_paths(json.loads(p.read_text(encoding="utf-8")), paths)
            p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Prepare and verify every compressed delivery before replacing old outputs.
    for pak in paks:
        target = pak.with_suffix(".zip")
        members = [p for p in files if p.parent == pak.parent]
        with zipfile.ZipFile(target, "x", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for p in members:
                # The converted font is already inside the PAK; keep a local
                # copy for inspection without duplicating it in the download.
                if p.suffix != ".ttf":
                    z.write(p, p.name)
        with zipfile.ZipFile(target) as z:
            if z.testzip() is not None:
                raise PatchError("输出 ZIP 校验失败")
        files.append(target)
    output.mkdir(parents=True, exist_ok=True)
    for p in files:
        dest = destination(p)
        dest.parent.mkdir(parents=True, exist_ok=True)
        p.replace(dest)
    result = rewrite_paths(result, paths)
    result.pop("manifest", None)  # Per-PAK reports remain valid across partial rebuilds.
    result["output_directory"] = str(output.resolve())
    result["zip_files"] = [str(destination(p.with_suffix('.zip')).resolve()) for p in paks]
    return result
