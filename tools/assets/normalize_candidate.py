#!/usr/bin/env python3
"""Приводит результат генератора к производственному кандидату уровня КН-01.

Шаги: вырезать фон #FF00FF → уменьшить блочным большинством до точного размера
из реестра → привести каждый пиксель к ближайшему цвету палитры → альфа 0/255
→ записать PNG RGBA по пути из реестра.

Требует Pillow (инструмент художника, в CI не запускается):
    python tools/assets/normalize_candidate.py raw.png HUB-L6-GROUND
    python tools/assets/normalize_candidate.py raw.png TIT-M1 --out путь/кандидат.png
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "assets/source/kn01_level1.image-spec.json"
CHROMA = (255, 0, 255)
CHROMA_TOLERANCE = 60


def load_gpl(path: Path) -> list[tuple[int, int, int]]:
    colors: list[tuple[int, int, int]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) >= 3 and all(p.isdigit() for p in parts[:3]):
            colors.append((int(parts[0]), int(parts[1]), int(parts[2])))
    return colors


def find_asset(asset_id: str) -> tuple[dict, dict]:
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    for asset in spec["assets"]:
        if asset["id"] == asset_id:
            return spec, asset
    raise SystemExit(f"Ассет {asset_id} не найден в {SPEC.relative_to(ROOT)}")


def is_chroma(rgb: tuple[int, int, int]) -> bool:
    return sum(abs(a - b) for a, b in zip(rgb, CHROMA)) <= CHROMA_TOLERANCE


def nearest(rgb: tuple[int, int, int], palette: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    r, g, b = rgb
    # Взвешенное расстояние ближе к восприятию, чем простое евклидово.
    return min(palette, key=lambda p: 2 * (p[0] - r) ** 2 + 4 * (p[1] - g) ** 2 + 3 * (p[2] - b) ** 2)


def block_majority(image, width: int, height: int):  # type: ignore[no-untyped-def]
    from PIL import Image

    src = image.load()
    sx, sy = image.width / width, image.height / height
    out = Image.new("RGBA", (width, height))
    dst = out.load()
    for y in range(height):
        for x in range(width):
            x0, x1 = int(x * sx), max(int((x + 1) * sx), int(x * sx) + 1)
            y0, y1 = int(y * sy), max(int((y + 1) * sy), int(y * sy) + 1)
            # Центральная часть блока: края часто содержат сглаживание генератора.
            mx, my = (x1 - x0) // 4, (y1 - y0) // 4
            votes = Counter(src[i, j] for i in range(x0 + mx, x1 - mx) for j in range(y0 + my, y1 - my))
            dst[x, y] = votes.most_common(1)[0][0]
    return out


def normalize(raw: Path, asset: dict, palette: list[tuple[int, int, int]]):  # type: ignore[no-untyped-def]
    from PIL import Image

    width, height = asset["size"]
    image = Image.open(raw).convert("RGBA")
    if (image.width, image.height) != (width, height):
        image = block_majority(image, width, height)
    pixels = image.load()
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            transparent = a < 128 or is_chroma((r, g, b))
            if asset["alpha"] == "transparent" and transparent:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            key = (r, g, b)
            if key not in cache:
                cache[key] = nearest(key, palette)
            pixels[x, y] = (*cache[key], 255)
    return image


def main() -> int:
    parser = argparse.ArgumentParser(description="Нормализация кандидата изображения уровня КН-01")
    parser.add_argument("raw", type=Path, help="результат генератора")
    parser.add_argument("asset_id", help="идентификатор из 08_IMAGE_PROMPTS.md")
    parser.add_argument("--out", type=Path, help="куда записать (по умолчанию — путь из реестра)")
    args = parser.parse_args()

    try:
        import PIL  # noqa: F401
    except ImportError:
        print("Нужен Pillow: python3 -m pip install pillow")
        return 1
    if not args.raw.is_file():
        print(f"Файл не найден: {args.raw}")
        return 1

    spec, asset = find_asset(args.asset_id)
    palette = load_gpl(ROOT / spec["palettes"]["master"])
    if asset["people"]:
        palette += load_gpl(ROOT / spec["palettes"]["people"])

    image = normalize(args.raw, asset, palette)
    out = args.out or ROOT / asset["path"]
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, format="PNG")

    used = {px[:3] for px in image.getdata() if px[3] == 255}
    print(f"{asset['id']}: записан {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}, "
          f"{image.width}×{image.height}, цветов {len(used)} из допустимых {asset['max_colors']}")
    if len(used) > asset["max_colors"]:
        print("Внимание: цветов больше лимита — объедините близкие оттенки вручную.")
    print("Дальше: ручная доработка в Aseprite и python tools/validate_pixel_art.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
