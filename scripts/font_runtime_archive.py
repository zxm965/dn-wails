"""Package a frozen runtime without repeated file contents or symbolic links."""
import hashlib
import json
import os
from pathlib import Path
import zipfile

MANIFEST = "runtime-files.json"


def write_runtime_archive(distribution: Path, destination: Path) -> None:
    root = distribution.resolve()
    if (root / MANIFEST).exists():
        raise ValueError(f"Reserved runtime filename: {MANIFEST}")
    seen = {}
    duplicates = []
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for directory, dirs, files in os.walk(root, followlinks=True):
            dirs.sort()
            for name in dirs:
                child = Path(directory) / name
                resolved = child.resolve()
                ancestors = {p.resolve() for p in child.parents if p.is_relative_to(root)}
                if not resolved.is_relative_to(root) or resolved in ancestors:
                    raise ValueError(f"Runtime directory escapes or loops: {child}")
            for name in sorted(files):
                path = Path(directory) / name
                resolved = path.resolve()
                if not resolved.is_relative_to(root) or not resolved.is_file():
                    raise ValueError(f"Runtime file escapes distribution: {path}")
                relative = path.relative_to(root).as_posix()
                stat = path.stat()
                with path.open("rb") as stream:
                    digest = hashlib.file_digest(stream, "sha256").digest()
                # Files with different executable permissions must stay distinct.
                key = (stat.st_size, stat.st_mode & 0o111, digest)
                if key in seen:
                    duplicates.append({"path": relative, "source": seen[key]})
                else:
                    archive.write(path, relative)
                    seen[key] = relative
        archive.writestr(MANIFEST, json.dumps({"version": 1, "duplicates": duplicates}))
