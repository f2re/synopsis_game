#!/usr/bin/env python3
"""Проверка технического контракта принятых игровых ассетов.

Проверяет ТОЛЬКО объективные технические свойства файла для игрового движка (Phaser / WebGL).
НЕ оценивает художественное качество (этим занимается art-review).
"""
from __future__ import annotations

import json
import struct
import sys
import zlib
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def read_png_dimensions_and_alpha(path: Path) -> tuple[int, int, set[int]]:
    raw = path.read_bytes()
    if not raw.startswith(PNG_SIGNATURE):
        raise ValueError(f"{path.name} не является корректным PNG файлом")

    pos = len(PNG_SIGNATURE)
    width = height = color_type = None
    idat = bytearray()

    while pos < len(raw):
        if pos + 8 > len(raw):
            break
        length = struct.unpack(">I", raw[pos:pos + 4])[0]
        chunk_type = raw[pos + 4:pos + 8]
        data = raw[pos + 8:pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", data
            )
            if bit_depth != 8 or compression != 0 or filter_method != 0 or interlace != 0:
                raise ValueError("Поддерживаются только неинтерлейсные 8-битные PNG")
        elif chunk_type == b"IDAT":
            idat.extend(data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None or color_type is None:
        raise ValueError("Отсутствует чанк IHDR")

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    decompressed = zlib.decompress(bytes(idat))
    
    alphas: set[int] = set()
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
            if filter_type == 0:
                result = value
            elif filter_type == 1:
                result = (value + left) & 0xFF
            elif filter_type == 2:
                result = (value + up) & 0xFF
            elif filter_type == 3:
                result = (value + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                # Paeth
                p = left + up - (previous[i - channels] if i >= channels else 0)
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - (previous[i - channels] if i >= channels else 0))
                pr = left if pa <= pb and pa <= pc else (up if pb <= pc else (previous[i - channels] if i >= channels else 0))
                result = (value + pr) & 0xFF
            else:
                result = value
            recon[i] = result
        previous = recon

        if channels == 4:
            for x in range(width):
                alphas.add(recon[x * 4 + 3])
        else:
            alphas.add(255)

    return width, height, alphas


def check_asset_contract(asset_path: Path, spec: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not asset_path.is_file():
        return [f"Файл не найден: {asset_path}"]

    try:
        width, height, alphas = read_png_dimensions_and_alpha(asset_path)
    except Exception as exc:
        return [f"Ошибка чтения PNG: {exc}"]

    expected_size = spec.get("size") or spec.get("logicalSize")
    if isinstance(expected_size, dict):
        expected_size = [expected_size["width"], expected_size["height"]]

    if expected_size:
        exp_w, exp_h = expected_size
        if (width, height) != (exp_w, exp_h):
            errors.append(f"Несовпадение размера: фактический {(width, height)} != ожидаемый {(exp_w, exp_h)}")

    alpha_rule = spec.get("alpha")
    if alpha_rule == "opaque":
        if alphas != {255}:
            errors.append(f"Ассет должен быть полностью непрозрачным (alpha==255), найдено: {sorted(alphas)}")
    elif alpha_rule == "transparent":
        fractional = [a for a in alphas if a not in (0, 255)]
        if fractional:
            errors.append(f"Запрещена дробная альфа (только 0 или 255), найдены значения: {fractional[:5]}")

    frame = spec.get("frame")
    if frame:
        if isinstance(frame, dict):
            fw, fh = frame["width"], frame["height"]
        else:
            fw, fh = frame[0], frame[1]
        if width % fw != 0 or height % fh != 0:
            errors.append(f"Размер спрайт-листа {(width, height)} не кратен размеру кадра ({fw}, {fh})")

    return errors


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Asset Technical Contract Checker")
    parser.add_argument("--file", help="Path to single asset PNG")
    parser.add_argument("--spec", help="Path to spec file (kn01_level1.image-spec.json or manifest)")
    parser.add_argument("--asset-id", help="Asset ID in spec")
    args = parser.parse_args()

    if args.file and args.spec:
        spec_path = Path(args.spec)
        data = json.loads(spec_path.read_text(encoding="utf-8"))
        asset_spec = None
        if "assets" in data:
            for a in data["assets"]:
                if a.get("id") == args.asset_id or a.get("path") in args.file:
                    asset_spec = a
                    break
        else:
            asset_spec = data

        if not asset_spec:
            print(f"Спецификация для {args.file} не найдена", file=sys.stderr)
            return 1

        errors = check_asset_contract(Path(args.file), asset_spec)
        if errors:
            print(f"Ошибки технического контракта для {args.file}:", file=sys.stderr)
            for err in errors:
                print(f"  • {err}", file=sys.stderr)
            return 1
        print(f"✓ Технический контракт выполнен: {args.file}")
        return 0

    print("Использование: check_asset_contract.py --file <path> --spec <path> [--asset-id <id>]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
