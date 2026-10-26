#!/usr/bin/env python3
"""Проверка пиксельных кандидатов без сторонних зависимостей.

Проверяет объективные свойства PNG. Художественная приёмка выполняется отдельно.
"""
from __future__ import annotations

import json
import struct
import sys
import zlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ASSETS: dict[str, dict[str, object]] = {
    "assets/source/environment/hub/candidates/hub_scene_v2.png": {
        "size": (480, 270), "max_colors": 72, "opaque": True,
    },
    "assets/source/environment/archive/candidates/archive_interior_scene_v2.png": {
        "size": (480, 270), "max_colors": 48, "opaque": True,
    },
    "assets/source/environment/archive/candidates/archive_facade_v2.png": {
        "size": (128, 88), "max_colors": 32,
    },
    "assets/source/environment/archive/candidates/archive_props_sheet_v2.png": {
        "size": (320, 160), "max_colors": 24,
    },
    "assets/source/animals/squirrel/candidates/squirrel_family_v2.png": {
        "size": (112, 80), "max_colors": 8, "frame": (28, 20),
    },
    "assets/source/animals/bird/candidates/bird_sheet_v2.png": {
        "size": (72, 14), "max_colors": 10, "frame": (18, 14),
    },
    "assets/source/environment/clouds/candidates/cloud_set_v2.png": {
        "size": (256, 32), "max_colors": 8, "frame": (64, 32),
    },
    "assets/source/environment/vegetation/candidates/vegetation_sheet_v2.png": {
        "size": (256, 64), "max_colors": 16, "frame": (64, 64),
    },
    "assets/source/ui/location-states/candidates/ui_location_states_v2.png": {
        "size": (256, 24), "max_colors": 14, "frame": (64, 24),
    },
    "assets/source/characters/base/candidates/avatar_base_sheet_v2.png": {
        "size": (384, 48), "max_colors": 12, "frame": (32, 48),
    },
    "assets/source/environment/hub/candidates/hub_background_l0_l2_v2.png": {
        "size": (480, 270), "max_colors": 72,
    },
    "assets/source/environment/hub/candidates/hub_ground_l2_l4_v2.png": {
        "size": (480, 270), "max_colors": 24,
    },
    "assets/source/environment/hub/candidates/hub_architecture_l3_v2.png": {
        "size": (480, 270), "max_colors": 40,
    },
    "assets/source/environment/hub/candidates/hub_decor_l4_v2.png": {
        "size": (480, 270), "max_colors": 32,
    },
    "assets/source/environment/archive/candidates/archive_room_shell_l2_v2.png": {
        "size": (480, 270), "max_colors": 32,
    },
    "assets/source/environment/archive/candidates/archive_furniture_l3_v2.png": {
        "size": (480, 270), "max_colors": 24,
    },
    "assets/source/environment/archive/candidates/archive_props_l4_v2.png": {
        "size": (480, 270), "max_colors": 24,
    },
}

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: Path) -> tuple[int, int, list[tuple[int, int, int, int]]]:
    raw = path.read_bytes()
    if not raw.startswith(PNG_SIGNATURE):
        raise ValueError("not a PNG file")

    pos = len(PNG_SIGNATURE)
    width = height = bit_depth = color_type = None
    idat = bytearray()

    while pos < len(raw):
        if pos + 8 > len(raw):
            raise ValueError("truncated PNG chunk")
        length = struct.unpack(">I", raw[pos:pos + 4])[0]
        chunk_type = raw[pos + 4:pos + 8]
        data = raw[pos + 8:pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", data
            )
            if bit_depth != 8 or compression != 0 or filter_method != 0 or interlace != 0:
                raise ValueError("validator supports only non-interlaced 8-bit PNG")
            if color_type not in (2, 6):
                raise ValueError(f"unsupported PNG color type {color_type}")
        elif chunk_type == b"IDAT":
            idat.extend(data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None or color_type is None:
        raise ValueError("missing IHDR")

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    decompressed = zlib.decompress(bytes(idat))
    expected = height * (stride + 1)
    if len(decompressed) != expected:
        raise ValueError(f"unexpected decompressed size {len(decompressed)} != {expected}")

    rows: list[bytearray] = []
    offset = 0
    previous = bytearray(stride)

    for _ in range(height):
        filter_type = decompressed[offset]
        scan = bytearray(decompressed[offset + 1:offset + 1 + stride])
        offset += stride + 1

        recon = bytearray(stride)
        for i, value in enumerate(scan):
            left = recon[i - channels] if i >= channels else 0
            up = previous[i]
            up_left = previous[i - channels] if i >= channels else 0
            if filter_type == 0:
                result = value
            elif filter_type == 1:
                result = (value + left) & 0xFF
            elif filter_type == 2:
                result = (value + up) & 0xFF
            elif filter_type == 3:
                result = (value + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                result = (value + paeth(left, up, up_left)) & 0xFF
            else:
                raise ValueError(f"unknown PNG filter {filter_type}")
            recon[i] = result
        rows.append(recon)
        previous = recon

    pixels: list[tuple[int, int, int, int]] = []
    for row in rows:
        for x in range(width):
            i = x * channels
            if channels == 3:
                pixels.append((row[i], row[i + 1], row[i + 2], 255))
            else:
                pixels.append((row[i], row[i + 1], row[i + 2], row[i + 3]))
    return width, height, pixels


def check_asset(path: Path, rules: dict[str, object]) -> tuple[list[str], dict[str, object]]:
    errors: list[str] = []
    width, height, pixels = read_png(path)
    colors = Counter(pixels)
    alphas = sorted({rgba[3] for rgba in colors})
    opaque_colors = sum(1 for rgba in colors if rgba[3] == 255)

    expected_size = tuple(rules["size"])
    if (width, height) != expected_size:
        errors.append(f"size {(width, height)} != {expected_size}")

    if any(alpha not in (0, 255) for alpha in alphas):
        errors.append(f"fractional alpha is forbidden: {alphas}")

    max_colors = int(rules["max_colors"])
    if opaque_colors > max_colors:
        errors.append(f"opaque colors {opaque_colors} > {max_colors}")

    if rules.get("opaque") and alphas != [255]:
        errors.append("scene must be fully opaque")

    frame = rules.get("frame")
    if frame:
        fw, fh = frame
        if width % fw or height % fh:
            errors.append(f"sheet is not aligned to frame grid {frame}")

    return errors, {
        "size": [width, height],
        "opaque_colors": opaque_colors,
        "alpha_values": alphas,
        "frame": list(frame) if frame else None,
    }


def main() -> int:
    failures: list[str] = []
    report: dict[str, object] = {"batch": "ART-BATCH-001", "assets": {}}

    for relative, rules in ASSETS.items():
        path = ROOT / relative
        if not path.exists():
            failures.append(f"missing: {relative}")
            continue
        try:
            errors, metrics = check_asset(path, rules)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{relative}: {exc}")
            continue
        report["assets"][relative] = {"metrics": metrics, "errors": errors}
        failures.extend(f"{relative}: {error}" for error in errors)

    report_path = ROOT / "assets/reviews/art-batch-001.pixel-report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if failures:
        print("Проверка пиксельной графики завершилась с ошибками:")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print(f"Проверка пиксельной графики успешно завершена: {len(ASSETS)} файлов.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
