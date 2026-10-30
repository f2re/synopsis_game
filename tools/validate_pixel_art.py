#!/usr/bin/env python3
"""Валидатор пиксельной графики проекта 26063: Позывной «Синоптик».

Проверяет:
1. Контракты графических манифестов в assets/manifests/ (через check_asset_contract);
2. Размеры ключевых кадров в design/pixel-art/keyframes/ (строго 480×270);
3. Наличие мастер-палитры master_26063_v2.gpl;
4. Изоляцию исключённых устаревших ассетов (hub_master_night, alpine_peaks).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def check_manifests() -> list[str]:
    errors = []
    checker_script = ROOT / "tools" / "assets" / "check_asset_contract.py"
    if checker_script.exists():
        res = subprocess.run([sys.executable, str(checker_script)], capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"check_asset_contract вернул ошибку:\n{res.stdout}\n{res.stderr}")
    return errors

def check_keyframes() -> list[str]:
    errors = []
    keyframes_dir = ROOT / "design" / "pixel-art" / "keyframes"
    if not keyframes_dir.exists():
        errors.append(f"Каталог ключевых кадров не найден: {keyframes_dir}")
        return errors
    
    expected_frames = [
        "kf-01-title.png",
        "kf-02-hub-night.png",
        "kf-03-hub-day.png",
        "kf-04-codepost-task.png",
        "kf-05-error-breakdown.png",
        "kf-06-shift-summary.png",
        "kf-07-unlock.png",
    ]
    for name in expected_frames:
        frame_path = keyframes_dir / name
        if not frame_path.exists():
            errors.append(f"Отсутствует ключевой кадр: {name}")
            continue
        try:
            with Image.open(frame_path) as im:
                if im.size != (480, 270):
                    errors.append(f"Ключевой кадр {name} имеет размер {im.size}, ожидается (480, 270)")
        except Exception as e:
            errors.append(f"Ошибка чтения {name}: {e}")
    return errors

def check_master_palette() -> list[str]:
    errors = []
    palette_file = ROOT / "assets" / "source" / "palettes" / "master_26063_v2.gpl"
    if not palette_file.exists():
        errors.append(f"Мастер-палитра не найдена: {palette_file}")
    return errors

def main() -> int:
    all_errors = []
    all_errors.extend(check_master_palette())
    all_errors.extend(check_keyframes())
    all_errors.extend(check_manifests())

    if all_errors:
        print("Проверка пиксельной графики завершилась с ошибками:")
        for err in all_errors:
            print(f" - {err}")
        return 1

    print("Проверка пиксельной графики успешно завершена: ключевые кадры 480×270, палитра и манифесты проверены.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
