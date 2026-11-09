"""Refresh the reviewed font builder snapshot from the sibling workbench.

Usage: python3 scripts/sync-font-patch.py /path/to/dn-ui-patch
The desktop release builds offline from this snapshot, never from a user's fonts.
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) / "src" / "dn_ui_patch"
target = root / "tools" / "font-patch" / "dn_ui_patch"
target.mkdir(parents=True, exist_ok=True)
names = ["__init__.py", "archive.py", "build_output.py", "font_conversion.py", "font_metadata.py", "desktop.py"]
manifest = {}
for name in names:
    shutil.copyfile(source / name, target / name)
    manifest[name] = hashlib.sha256((target / name).read_bytes()).hexdigest()
(target.parent / "source-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
