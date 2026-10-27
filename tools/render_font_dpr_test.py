#!/usr/bin/env python3
"""Рендеринг образцов пиксельной типографики при различных DPR (W1-07)."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONTS_DIR = ROOT / "assets" / "fonts"
PIX_CYRILLIC_PATH = FONTS_DIR / "PixCyrillic.ttf"
PRESS_START_PATH = FONTS_DIR / "PressStart2P-Regular.ttf"
OUT_DIR = ROOT / "docs" / "roadmap" / "kn01-aaa" / "evidence" / "W1-07" / "screenshots"

OUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLES = [
    ("Титул (64px)", PIX_CYRILLIC_PATH, 64, "26063: Позывной «Синоптик»"),
    ("Заголовок h1 (32px)", PIX_CYRILLIC_PATH, 32, "Кодовый пост · Смена 1: Позывные эфира"),
    ("Основной текст (16px)", PIX_CYRILLIC_PATH, 16, "Сводка погоды принята без помарок. Точка росы: −0,8 °C."),
    ("Плотный текст (16px)", PIX_CYRILLIC_PATH, 16, "Панграмма: Съешь же ещё этих мягких французских булок, да выпей чаю."),
    ("Телеграмма и код (16px)", PRESS_START_PATH, 16, "AAXX 26181 26063 72406 10052 21008 57014="),
    ("Метки разбора (8px)", PRESS_START_PATH, 8, "sn TTT  sn TdTdTd  PoPoPoPo  PPPP  appp"),
]

DPRS = [1.0, 1.25, 1.5, 2.0]

for dpr in DPRS:
    base_w, base_h = 720, 360
    w = int(base_w * dpr)
    h = int(base_h * dpr)
    
    # Фон: фирменный цвет бумаги/поста (#14202B)
    img = Image.new("RGB", (w, h), color=(20, 32, 43))
    draw = ImageDraw.Draw(img)
    
    y = int(20 * dpr)
    # Заголовок DPR
    title_font = ImageFont.truetype(str(PRESS_START_PATH), int(10 * dpr))
    draw.text((int(20 * dpr), y), f"DEVICE PIXEL RATIO: {dpr}x (Canvas: {w}x{h})", fill=(242, 199, 92), font=title_font)
    y += int(25 * dpr)
    
    for label, font_path, size_pt, text in SAMPLES:
        scaled_size = int(size_pt * dpr)
        try:
            font = ImageFont.truetype(str(font_path), scaled_size)
            label_font = ImageFont.truetype(str(PRESS_START_PATH), int(8 * dpr))
            draw.text((int(20 * dpr), y), label, fill=(130, 160, 175), font=label_font)
            y += int(14 * dpr)
            draw.text((int(20 * dpr), y), text, fill=(240, 244, 247), font=font)
            y += int((size_pt + 16) * dpr)
        except Exception as e:
            print(f"Error rendering {label} at DPR {dpr}: {e}")

    filename = f"dpr_{str(dpr).replace('.', '_')}.png"
    out_path = OUT_DIR / filename
    img.save(out_path)
    print(f"Сгенерирован снимок типографики: {out_path} ({w}x{h})")

print("Все снимки типографики успешно сгенерированы.")
