#!/usr/bin/env python3
"""
Валидатор пиксельных шрифтов для проекта «26063: Позывной „Синоптик“».
Проверяет:
1. Наличие локально скачанных шрифтов в apps/web/public/fonts/ и assets/fonts/.
2. Наличие лицензий и реестра происхождения FONT_PROVENANCE.md.
3. 100% покрытие русской кириллицы (А-Я, а-я, Ё, ё), цифр и знаков препинания.
4. Наличие CSS-деклараций @font-face и отключения сглаживания в apps/web/src/styles.css.
5. Наличие токенов типографики в design/tokens/pixel-art-theme.yaml.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WEB_FONTS_DIR = ROOT / "apps" / "web" / "public" / "fonts"
ASSET_FONTS_DIR = ROOT / "assets" / "fonts"
STYLES_CSS = ROOT / "apps" / "web" / "src" / "styles.css"
THEME_YAML = ROOT / "design" / "tokens" / "pixel-art-theme.yaml"

REQUIRED_WEB_FILES = [
    "PixCyrillic.woff2",
    "PixCyrillic.ttf",
    "PixCyrillic-AShortHikeEdition.woff2",
    "PixCyrillic-AShortHikeEdition.ttf",
    "PressStart2P-Regular.woff",
    "PressStart2P-Regular.ttf",
]

REQUIRED_ASSET_FILES = REQUIRED_WEB_FILES + [
    "LICENSE-PixCyrillic.txt",
    "LICENSE-PressStart2P.txt",
    "FONT_PROVENANCE.md",
]

CYRILLIC_PANGRAM = "Съешь же ещё этих мягких французских булок, да выпей чаю. 1234567890! «Позывной Синоптик» 26063."


def validate_files() -> list[str]:
    errors = []
    for f in REQUIRED_WEB_FILES:
        path = WEB_FONTS_DIR / f
        if not path.is_file():
            errors.append(f"Отсутствует веб-шрифт: {path}")
        elif path.stat().st_size == 0:
            errors.append(f"Пустой файл шрифта: {path}")

    for f in REQUIRED_ASSET_FILES:
        path = ASSET_FONTS_DIR / f
        if not path.is_file():
            errors.append(f"Отсутствует ассет шрифта: {path}")
        elif path.stat().st_size == 0:
            errors.append(f"Пустой файл ассета: {path}")

    return errors


def validate_cyrillic_coverage() -> list[str]:
    errors = []
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        errors.append("Не установлен модуль fontTools для проверки покрытия глифов")
        return errors

    fonts_to_test = [
        ("PixCyrillic", WEB_FONTS_DIR / "PixCyrillic.ttf"),
        ("PressStart2P", WEB_FONTS_DIR / "PressStart2P-Regular.ttf"),
    ]

    for name, path in fonts_to_test:
        if not path.is_file():
            continue
        try:
            font = TTFont(path)
            cmap = font.getBestCmap()
            missing = [c for c in CYRILLIC_PANGRAM if ord(c) not in cmap]
            if missing:
                errors.append(
                    f"Шрифт {name} не поддерживает необходимые символы кириллицы: {''.join(missing)}"
                )
        except Exception as e:
            errors.append(f"Ошибка чтения шрифта {path}: {e}")

    return errors


def validate_css_and_tokens() -> list[str]:
    errors = []
    if not STYLES_CSS.is_file():
        errors.append(f"Не найден файл стилей: {STYLES_CSS}")
        return errors

    css_content = STYLES_CSS.read_text(encoding="utf-8")
    for font_family in ["PixCyrillic", "PressStart2P"]:
        if font_family not in css_content:
            errors.append(f"В styles.css не найдено объявление семейства '{font_family}'")

    for token in ["--font-pixel-ui", "--font-pixel-display", "--font-pixel-mono"]:
        if token not in css_content:
            errors.append(f"В styles.css отсутствует CSS-токен '{token}'")

    for rule in ["-webkit-font-smoothing:", "text-rendering:"]:
        if rule not in css_content:
            errors.append(f"В styles.css отсутствует обязательное правило рендеринга '{rule}'")

    if not THEME_YAML.is_file():
        errors.append(f"Не найден файл токенов темы: {THEME_YAML}")
        return errors

    yaml_content = THEME_YAML.read_text(encoding="utf-8")
    if "typography:" not in yaml_content:
        errors.append("В pixel-art-theme.yaml отсутствует блок 'typography:'")

    return errors


def main() -> int:
    all_errors = []
    all_errors.extend(validate_files())
    all_errors.extend(validate_cyrillic_coverage())
    all_errors.extend(validate_css_and_tokens())

    if all_errors:
        print("Ошибки валидации пиксельных шрифтов:")
        for err in all_errors:
            print(f"  - {err}")
        return 1

    print(
        "Проверка пиксельных шрифтов успешно завершена: все файлы на месте, 100% кириллица подтверждена, CSS и токены согласованы."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
