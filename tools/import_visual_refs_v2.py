#!/usr/bin/env python3
"""Безопасный побайтовый импорт утверждённых референсов R01–R06 из ZIP.

Пример:
    python tools/import_visual_refs_v2.py synopsis_screen_v2_originals_verified.zip
    python tools/validate_visual_refs_v2.py

Скрипт не извлекает посторонние пути из ZIP и не заменяет повреждённые
или изменённые целевые файлы. Сначала проверяются ВСЕ шесть источников.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path("design/pixel-art/v2/manifest.json")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def checked_entries(archive: zipfile.ZipFile, root: Path) -> list[tuple[Path, bytes]]:
    manifest = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    entries: list[tuple[Path, bytes]] = []
    images = manifest.get("images", [])
    if len(images) != 6:
        raise ValueError(f"Требуется 6 эталонов, в манифесте: {len(images)}")
    seen: set[str] = set()
    for image in images:
        relative = image["path"]
        expected = Path("design/pixel-art/v2") / (image["id"] + ".png")
        if relative != expected.as_posix() or relative in seen:
            raise ValueError(f"Недопустимый или повторный путь в манифесте: {relative}")
        seen.add(relative)
        try:
            data = archive.read(relative)
        except KeyError as exc:
            raise ValueError(f"Файл отсутствует в архиве: {relative}") from exc
        if len(data) != image["size_bytes"]:
            raise ValueError(f"Неверный размер файла: {relative}")
        if hashlib.sha256(data).hexdigest() != image["sha256"]:
            raise ValueError(f"Контрольная сумма SHA-256 не совпадает: {relative}")
        if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
            raise ValueError(f"Неверная сигнатура PNG: {relative}")
        if struct.unpack(">II", data[16:24]) != (image["width"], image["height"]):
            raise ValueError(f"Неверные размеры изображения: {relative}")
        target = root / expected
        if target.exists() and target.read_bytes() != data:
            raise ValueError(f"Целевой файл уже существует и отличается: {relative}")
        entries.append((target, data))
    return entries


def import_archive(archive_path: Path, root: Path = ROOT) -> int:
    with zipfile.ZipFile(archive_path, "r") as archive:
        entries = checked_entries(archive, root)

    created = 0
    for target, data in entries:
        if target.exists():
            print(f"Уже проверен: {target.relative_to(root)}")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix="v2-ref-", suffix=".png", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, target)
            created += 1
            print(f"Импортирован: {target.relative_to(root)}")
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    print(f"Проверено: 6, новых файлов: {created}. Запустите tools/validate_visual_refs_v2.py")
    return created


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="ZIP с design/pixel-art/v2/01_hub.png ... 06_progression.png")
    args = parser.parse_args()
    try:
        import_archive(args.archive)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        parser.exit(1, f"ОШИБКА: {exc}\n")
