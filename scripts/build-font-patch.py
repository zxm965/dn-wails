"""Build and embed a native standalone font runtime (no end-user Python)."""
import hashlib
import json
from importlib.metadata import distribution as package_distribution
from pathlib import Path
import platform
import subprocess
import shutil
import sys
import sysconfig
import tempfile

from font_runtime_archive import write_runtime_archive

root = Path(__file__).resolve().parents[1]
source = root / "tools" / "font-patch"
system = {"Darwin": "darwin", "Windows": "windows"}.get(platform.system())
arch = {"arm64": "arm64", "aarch64": "arm64", "AMD64": "amd64", "x86_64": "amd64"}.get(platform.machine())
if not system or not arch:
    raise SystemExit("Font runtime builds currently support macOS and Windows only")
for name, expected in json.loads((source / "source-manifest.json").read_text()).items():
    if hashlib.sha256((source / "dn_ui_patch" / name).read_bytes()).hexdigest() != expected:
        raise SystemExit(f"Font source snapshot mismatch: {name}; run scripts/sync-font-patch.py")
destination = root / "internal" / "platform" / "fontpatch" / "runtime" / f"{system}-{arch}.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="font-patch-build-") as temp:
    work = Path(temp)
    subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir",
                    "--name", "dn-font-patch", "--noupx",
                    # Font table handlers are loaded dynamically by their tags.
                    # Keep all table handlers, but not the fontTools CLI, source,
                    # test data, or optional dependencies of unrelated tools.
                    "--collect-submodules", "fontTools.ttLib.tables",
                    "--collect-binaries", "freetype",
                    # Conversion is local-only. hashlib falls back to CPython's
                    # built-in hash implementations, avoiding OpenSSL binaries.
                    "--exclude-module", "ssl", "--exclude-module", "_ssl",
                    "--exclude-module", "_hashlib",
                    "--distpath", str(work / "dist"), "--workpath", str(work / "work"),
                    "--specpath", str(work), str(source / "worker.py")], check=True)
    distribution = work / "dist" / "dn-font-patch"
    licenses = distribution / "licenses"
    licenses.mkdir()
    for package in ("fonttools", "pyinstaller", "freetype-py"):
        metadata = package_distribution(package)
        for name in metadata.files or []:
            if ".dist-info/licenses/" in str(name) or (".dist-info/" in str(name) and Path(str(name)).name.lower().startswith(("license", "copying"))):
                target = licenses / package / Path(str(name)).name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(metadata.locate_file(name), target)
    shutil.copytree(source / "licenses", licenses / "freetype-native")
    import freetype
    native_library = Path(freetype.__file__).parent / freetype.raw.library_name
    if not native_library.is_file() or Path(freetype.raw._lib._name).resolve() != native_library.resolve():
        raise SystemExit("freetype-py must supply its bundled native library; install the binary wheel")
    if not (distribution / "_internal" / "freetype" / freetype.raw.library_name).is_file():
        raise SystemExit("Frozen runtime is missing bundled FreeType")
    python_license = Path(sysconfig.get_path("stdlib")) / "LICENSE.txt"
    if not python_license.is_file():
        python_license = Path(sys.base_prefix) / "LICENSE.txt"
    if not python_license.is_file():
        raise SystemExit("Python distribution license not found")
    shutil.copyfile(python_license, licenses / "Python-LICENSE.txt")
    executable = distribution / ("dn-font-patch.exe" if system == "windows" else "dn-font-patch")
    # Smoke-test the frozen process and its JSON protocol before shipping it.
    probe = subprocess.run([str(executable)], input=b'{}', capture_output=True, timeout=30)
    if probe.returncode != 1 or not json.loads(probe.stdout).get("error"):
        raise SystemExit("Frozen font runtime smoke test failed")
    # Store identical files once, including PyInstaller's framework aliases.
    # The Go runner restores aliases as regular files, never symbolic links.
    staged = destination.with_suffix(".zip.tmp")
    write_runtime_archive(distribution, staged)
    staged.replace(destination)
print(f"{destination}: {destination.stat().st_size / 1024**2:.2f} MiB")
