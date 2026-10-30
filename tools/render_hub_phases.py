#!/usr/bin/env python3
"""Рендеринг многослойного живого мира станции 26063 по 6 фазам суток (480x270 и 1920x1080)."""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "roadmap" / "kn01-aaa" / "evidence" / "W3-01" / "screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Фазы суток и их цветовые рампы
PHASES = {
    "night": {
        "sky_top": (7, 13, 30),
        "sky_horizon": (38, 59, 102),
        "tint": (7, 13, 30, 80),
        "window_alpha": 200,
        "lanterns": True,
        "stars": True,
        "celestial": "moon",
    },
    "dawn": {
        "sky_top": (75, 58, 110),
        "sky_horizon": (244, 185, 138),
        "tint": (244, 185, 138, 30),
        "window_alpha": 100,
        "lanterns": True,
        "stars": False,
        "celestial": "sun_dawn",
    },
    "day": {
        "sky_top": (94, 143, 196),
        "sky_horizon": (196, 221, 240),
        "tint": None,
        "window_alpha": 25,
        "lanterns": False,
        "stars": False,
        "celestial": "sun",
    },
    "golden_hour": {
        "sky_top": (122, 76, 128),
        "sky_horizon": (244, 185, 138),
        "tint": (224, 138, 122, 35),
        "window_alpha": 75,
        "lanterns": False,
        "stars": False,
        "celestial": "sun_gold",
    },
    "twilight": {
        "sky_top": (24, 40, 77),
        "sky_horizon": (178, 96, 127),
        "tint": (75, 58, 110, 55),
        "window_alpha": 160,
        "lanterns": True,
        "stars": True,
        "celestial": "crescent",
    },
    "white_nights": {
        "sky_top": (58, 83, 131),
        "sky_horizon": (224, 138, 122),
        "tint": (58, 83, 131, 38),
        "window_alpha": 115,
        "lanterns": True,
        "stars": False,
        "celestial": "pale_sun",
    },
}

# Загрузка растровых слоёв
l0_bg = Image.open(ROOT / "assets/source/environment/hub/candidates/hub_background_l0_l2_v2.png").convert("RGBA")
l1_clouds = Image.open(ROOT / "assets/source/environment/clouds/candidates/cloud_set_v2.png").convert("RGBA")
l3_ground = Image.open(ROOT / "assets/source/environment/hub/candidates/hub_ground_l2_l4_v2.png").convert("RGBA")
l5_arch = Image.open(ROOT / "assets/source/environment/hub/candidates/hub_architecture_l3_v2.png").convert("RGBA")
l7_decor = Image.open(ROOT / "assets/source/environment/hub/candidates/hub_decor_l4_v2.png").convert("RGBA")
l9_veg = Image.open(ROOT / "assets/source/environment/vegetation/candidates/vegetation_sheet_v2.png").convert("RGBA")

LANTERNS = [(50, 168), (154, 168), (270, 168), (368, 168), (440, 168)]
WINDOWS = [
    # Кодовый пост
    (194, 124, 14, 10), (214, 124, 14, 10), (234, 124, 14, 10),
    # Архив
    (70, 132, 12, 12), (90, 132, 12, 12), (110, 132, 12, 12),
]

for phase_name, pdata in PHASES.items():
    canvas = Image.new("RGBA", (480, 270), (0, 0, 0, 255))
    draw = ImageDraw.Draw(canvas)

    # 1. Градиент неба L0 (y=0..132)
    top_col = pdata["sky_top"]
    bot_col = pdata["sky_horizon"]
    for y in range(132):
        factor = y / 132.0
        r = int(top_col[0] + (bot_col[0] - top_col[0]) * factor)
        g = int(top_col[1] + (bot_col[1] - top_col[1]) * factor)
        b = int(top_col[2] + (bot_col[2] - top_col[2]) * factor)
        draw.line([(0, y), (480, y)], fill=(r, g, b, 255))

    # Звёзды
    if pdata["stars"]:
        for i in range(35):
            sx = (i * 37 + 13) % 480
            sy = (i * 19 + 7) % 85
            canvas.putpixel((sx, sy), (244, 247, 250, 240))

    # Светило
    cel = pdata["celestial"]
    if "sun" in cel:
        sun_color = (255, 231, 160, 240) if "gold" in cel or "dawn" in cel else (255, 255, 230, 250)
        draw.ellipse([373, 35, 387, 49], fill=sun_color)
    elif "moon" in cel or "crescent" in cel:
        draw.ellipse([404, 30, 416, 42], fill=(244, 247, 250, 255))
        draw.ellipse([402, 29, 412, 39], fill=top_col + (255,))

    # 2. Облака L1
    canvas.alpha_composite(l1_clouds, (40, 22))
    canvas.alpha_composite(l1_clouds, (220, 45))

    # 3. Горизонт Финского залива и дальний лес L2
    canvas.alpha_composite(l0_bg)

    # 4. Вода и гранитный рельеф двора L3/L6
    canvas.alpha_composite(l3_ground)

    # 5. Архитектура кампуса 26063 L5
    canvas.alpha_composite(l5_arch)

    # Свет в окнах
    if pdata["window_alpha"] > 0:
        win_overlay = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
        win_draw = ImageDraw.Draw(win_overlay)
        for wx, wy, ww, wh in WINDOWS:
            win_draw.rectangle([wx, wy, wx + ww, wy + wh], fill=(255, 199, 104, pdata["window_alpha"]))
        canvas.alpha_composite(win_overlay)

    # 6. Уличные фонари и мачты L7
    canvas.alpha_composite(l7_decor)

    # Ореол фонарей
    if pdata["lanterns"]:
        lantern_overlay = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
        l_draw = ImageDraw.Draw(lantern_overlay)
        for lx, ly in LANTERNS:
            l_draw.ellipse([lx - 6, ly - 6, lx + 6, ly + 6], fill=(184, 100, 42, 60))
            l_draw.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=(255, 231, 160, 220))
        canvas.alpha_composite(lantern_overlay)

    # 7. Животные и NPC (L8)
    l8_overlay = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
    l8_draw = ImageDraw.Draw(l8_overlay)
    # Кот Барограф у крыльца
    l8_draw.rectangle([202, 162, 212, 166], fill=(101, 108, 120, 255))
    l8_draw.rectangle([211, 160, 214, 164], fill=(70, 76, 88, 255))
    # Синица у будки
    l8_draw.rectangle([244, 152, 248, 155], fill=(242, 199, 92, 255))
    # Наставник Вера Павловна
    l8_draw.rectangle([180, 146, 186, 164], fill=(27, 86, 96, 255))
    l8_draw.rectangle([181, 140, 185, 145], fill=(233, 228, 214, 255))
    # Аватар игрока
    l8_draw.rectangle([215, 162, 221, 175], fill=(54, 124, 139, 255))
    l8_draw.rectangle([216, 156, 220, 161], fill=(233, 228, 214, 255))
    canvas.alpha_composite(l8_overlay)

    # 8. Ветви переднего плана L9
    canvas.alpha_composite(l9_veg, (0, 0))

    # 9. Атмосферный тинт L10
    if pdata["tint"]:
        tint_layer = Image.new("RGBA", (480, 270), pdata["tint"])
        canvas.alpha_composite(tint_layer)

    # 10. Виньетка
    vignette = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(vignette)
    v_draw.rectangle([0, 0, 480, 1], fill=(7, 13, 30, 120))
    v_draw.rectangle([0, 269, 480, 270], fill=(7, 13, 30, 120))
    v_draw.rectangle([0, 0, 1, 270], fill=(7, 13, 30, 120))
    v_draw.rectangle([479, 0, 480, 270], fill=(7, 13, 30, 120))
    canvas.alpha_composite(vignette)

    # Сохранение 1x (480x270)
    p1x = OUT_DIR / f"hub_phase_{phase_name}_1x.png"
    canvas.save(p1x)

    # Сохранение 4x (1920x1080, Nearest-Neighbor)
    canvas4x = canvas.resize((1920, 1080), Image.Resampling.NEAREST)
    p4x = OUT_DIR / f"hub_phase_{phase_name}_4x.png"
    canvas4x.save(p4x)

    print(f"✓ Фаза {phase_name:12s} сохранена: {p1x.name} и {p4x.name}")

print("\nВсе 6 фаз суток успешно отрисованы!")
