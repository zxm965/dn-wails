"""Bounded, read-only PAK inspection and explicit new-file writing."""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import struct

MAGIC = b"EyedentityGames Packing File 0.1"
MAX_RESOURCE = 256 * 1024 * 1024
MARKETING_PATHS = (
    "resource/ui/menu/eventbtdlg.ui",
    "resource/ui/mission/guidemissionsuminfodlg.ui",
)


class PatchError(ValueError):
    pass


def resource_path(value: str) -> str:
    name = value.replace("\\", "/").lstrip("/")
    if not name or any(p in ("", ".", "..") for p in name.split("/")):
        raise PatchError("资源路径不合法")
    if any(c in name for c in (":", "\0")):
        raise PatchError("资源路径包含非法字符")
    return name


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class Entry:
    path: str
    stored_size: int
    real_size: int
    alloc_size: int
    offset: int
    reserved: bytes = bytes(44)


class Archive:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.size = self.path.stat().st_size
        with self.path.open("rb") as f:
            header = f.read(272)
            if len(header) != 272 or header[:256].rstrip(b"\0") != MAGIC:
                raise PatchError("不是已支持的 Eyedentity PAK")
            self.version, count, self.index = struct.unpack_from("<3I", header, 256)
            if self.version not in (10, 11):
                raise PatchError(f"未支持的 PAK 版本：{self.version}")
            if count > 100_000 or self.index < 272 or self.index + count * 316 > self.size:
                raise PatchError("目录越界或条目过多")
            f.seek(self.index)
            entries = []
            for _ in range(count):
                raw = f.read(316)
                raw_name = raw[:256].split(b"\0", 1)[0]
                try:
                    name = raw_name.decode("utf-8")
                except UnicodeDecodeError:
                    raise PatchError("当前只支持 UTF-8/ASCII 资源路径") from None
                name = resource_path(name)
                stored, real, alloc, offset = struct.unpack_from("<4I", raw, 256)
                if stored != alloc:
                    raise PatchError(f"暂未支持非等长分配条目：{name}")
                if max(stored, real) > MAX_RESOURCE:
                    raise PatchError(f"资源超出 256 MiB 限制：{name}")
                if offset < 272 or offset + stored > self.size:
                    raise PatchError(f"资源数据越界：{name}")
                if stored and offset < self.index + count * 316 and offset + stored > self.index:
                    raise PatchError(f"资源与目录重叠：{name}")
                entries.append(Entry(name, stored, real, alloc, offset, raw[272:316]))
        self.entries = {e.path.casefold(): e for e in entries}
        if len(self.entries) != len(entries):
            raise PatchError("存在重复资源路径")

    def entry(self, name: str) -> Entry:
        try:
            return self.entries[resource_path(name).casefold()]
        except KeyError:
            raise PatchError(f"包内没有资源：{name}") from None

    def payload(self, entry: Entry) -> bytes:
        with self.path.open("rb") as f:
            f.seek(entry.offset)
            data = f.read(entry.stored_size)
        if len(data) != entry.stored_size:
            raise PatchError("读取时源包发生变化")
        return data


def write_archive(output: Path, resources: list[tuple[Entry, bytes]],
                  padding_mib: int = 0, version: int = 11) -> dict:
    if not resources:
        raise PatchError("不生成空补丁")
    if not 0 <= padding_mib <= 2048:
        raise PatchError("填充大小应为 0–2048 MiB")
    names = [resource_path(e.path).casefold() for e, _ in resources]
    if len(names) != len(set(names)):
        raise PatchError("输出存在同路径冲突，需要合并修改后再生成")
    table = bytearray()
    offset = 1024
    for entry, payload in resources:
        name = ("\\" + resource_path(entry.path).replace("/", "\\")).encode("utf-8")
        if len(name) >= 256 or len(payload) > MAX_RESOURCE or len(entry.reserved) != 44:
            raise PatchError("资源名称、长度或保留字段不合法")
        table += name.ljust(256, b"\0")
        table += struct.pack("<4I", len(payload), entry.real_size, len(payload), offset)
        table += entry.reserved
        offset += len(payload)
    header = MAGIC.ljust(256, b"\0") + struct.pack("<3I", version, len(resources), offset)
    header = header.ljust(1024, b"\0")
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation: never overwrite an original archive or an earlier build.
    with output.open("xb") as f:
        f.write(header)
        for _, payload in resources:
            f.write(payload)
        f.write(table)
        if padding_mib:
            f.truncate(max(f.tell(), padding_mib * 1024 * 1024))
    check = Archive(output)
    for entry, payload in resources:
        if check.payload(check.entry(entry.path)) != payload:
            raise PatchError("输出回读校验失败")
    return {
        "output": str(output.resolve()), "file_count": len(resources),
        "archive_bytes": check.size, "container_verified": True,
        "game_verified": False,
        "resources": [{"path": e.path, "payload_sha256": digest(p),
                       "declared_plain_bytes": e.real_size} for e, p in resources],
    }
