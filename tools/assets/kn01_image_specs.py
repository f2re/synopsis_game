#!/usr/bin/env python3
"""Единый источник спецификаций изображений уровня КН-01.

Из этих данных собираются:
- docs/roadmap/kn01-aaa/08_IMAGE_PROMPTS.md — промпты и требования для художника;
- assets/source/kn01_level1.image-spec.json — машинный реестр для validate_pixel_art.py
  и normalize_candidate.py.

Правится только этот файл, затем:
    python tools/assets/kn01_image_specs.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs/roadmap/kn01-aaa/08_IMAGE_PROMPTS.md"
SPEC = ROOT / "assets/source/kn01_level1.image-spec.json"
MASTER_PALETTE = "assets/source/palettes/master_26063_v2.gpl"
PEOPLE_PALETTE = "assets/source/palettes/people_26063_v1.gpl"

STYLE_LOCK = (
    "STYLE LOCK: modern high-quality pixel art (reference feel: Eastward, Sea of Stars, A Short Hike), "
    "crisp hard-edged square pixels on a strict logical pixel grid, deliberate clusters of 2+ pixels, "
    "no anti-aliasing blur, no soft gradients (only ordered 2x2 dithering, max 3 bands), no noise, "
    "no photographic texture, no painterly brush strokes, no 3D-render look. Light from upper-left. "
    "Outlines are a darker shade of the local colour, never pure black. "
    "World: fictional cozy scientific meteorological campus on the shore of the Gulf of Finland near "
    "St Petersburg, North-West Russia: flat low horizon, water, birch and pine, granite embankments, "
    "ochre and terracotta facades, warm amber windows against a cool blue night. "
    "Absolutely no mountains or hills, no palms, no text, letters, digits or logos anywhere in the image, "
    "no UI, no watermark, no signature, no frame around the picture."
)
NEG_COMMON = (
    "blurry, anti-aliased, smooth gradient, painterly, oil painting, watercolor, 3d render, photo, "
    "noise, jpeg artifacts, text, letters, numbers, logo, watermark, signature, mountains, hills, "
    "alps, palm trees, chromatic aberration, bloom, lens flare, isometric perspective drift"
)

RAMPS = {
    "night": "#070D1E #0E1A35 #18284D #263B66 #3A5383",
    "twilight": "#4B3A6E #7A4C80 #B2607F #E08A7A #F4B98A",
    "day": "#5E8FC4 #8DB7DE #C4DDF0",
    "water": "#0B2236 #143A52 #22566F #3E7C93 #8DBFCF",
    "foliage": "#0F241B #1B3A2A #2A5638 #3F7546 #6A9A55 #A3C46B",
    "birch_snow": "#4A4740 #B9B2A0 #E9E4D6 #F4F7FA",
    "stone": "#2D323C #464C58 #656C78 #8D939C #B9BDC2",
    "facade": "#6B3A2C #9A5838 #C98A4E #E6C07A",
    "window": "#B8642A #F29F45 #FFC768 #FFE7A0",
    "ui_teal": "#0C2A33 #143F4C #1B5660 #367C8B #6F9E95",
    "paper": "#BFAF8A #E2D6B6 #F3ECD8",
    "ink": "#1E2430 #2A303F #4B5263",
    "marks": "#B8423A (красный карандаш) #2F6E5A (штамп)",
    "accent": "#B88626 #F2C75C #FFDD83",
    "state": "#5FAF78 #D89A52 #D65E5E #7FB8D8",
    "people": "кожа #F2C9A8/#D9A07E, #D9A07A/#B97850, #B9784E/#8E5434, #7A4A30/#563220; "
              "волосы #2B211C #5A3A26 #A0703E #D8B66A #9A9AA4",
}

PEOPLE_GPL = [
    ("skin_1", "#F2C9A8"), ("skin_1_shadow", "#D9A07E"),
    ("skin_2", "#D9A07A"), ("skin_2_shadow", "#B97850"),
    ("skin_3", "#B9784E"), ("skin_3_shadow", "#8E5434"),
    ("skin_4", "#7A4A30"), ("skin_4_shadow", "#563220"),
    ("hair_dark", "#2B211C"), ("hair_brown", "#5A3A26"),
    ("hair_light", "#A0703E"), ("hair_blond", "#D8B66A"), ("hair_grey", "#9A9AA4"),
]

ASSETS: list[dict] = []


def add(asset_id: str, task: str, path: str, title: str, size: tuple[int, int], *,
        alpha: str = "transparent", max_colors: int = 16, ramps: tuple[str, ...] = (),
        frame: tuple[int, int] | None = None, layout: str = "", fps: str = "",
        pivot: str = "", place: str = "", content: str = "", must_not: str = "",
        prompt: str = "", post: str = "", people: bool = False, group: str = "") -> None:
    ASSETS.append({
        "id": asset_id, "task": task, "group": group, "path": path, "title": title,
        "size": list(size), "frame": list(frame) if frame else None, "alpha": alpha,
        "max_colors": max_colors, "ramps": list(ramps), "layout": layout, "fps": fps,
        "pivot": pivot, "place": place, "content": content, "must_not": must_not,
        "prompt": prompt, "post": post, "people": people,
    })


# ---------------------------------------------------------------- ключевые кадры
KF = "design/pixel-art/keyframes/"
G = "Ключевые кадры (эталоны приёмки)"
add("KF-01", "W1-06", KF + "kf-01-title.png", "Титульный экран", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "water", "window", "facade", "stone", "foliage", "birch_snow"), group=G,
    content="Ночной вид с гранитной набережной через воду на кампус: низкий горизонт на y≈150, три здания с тёплыми окнами, "
            "радарный купол, мачта с красным огнём, отражения окон в воде, берёза слева на переднем плане, фонарь. "
            "Верхняя треть кадра — спокойное небо (место под знак 26063 и подзаголовок). Нижняя полоса y 220–270 — тёмная набережная (место под кнопки).",
    must_not="Не рисовать надписи, знак 26063, кнопки — только пустые спокойные области под них.",
    prompt="Night view across calm water to a small scientific meteorological campus, seen from a granite embankment. "
           "Low flat horizon at 55% of image height, three modest buildings with warm amber windows, a white radar dome on a "
           "short tower, a slim mast with a red obstruction light, long vertical window reflections on the water, a birch "
           "tree framing the left edge, one embankment lamp. Upper third is empty calm night sky with a few stars; bottom band "
           "is a dark empty embankment. Quiet, cozy, professional mood.",
    post="Сверить с палитрой, убрать одиночные пиксели, проверить, что верх и низ пусты под интерфейс.")
add("KF-02", "W1-06", KF + "kf-02-hub-night.png", "Хаб ночью (композиция)", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "water", "window", "facade", "stone", "foliage"), group=G,
    content="Полная композиция хаба по раскладке §2.3 этого документа ночью: 6 зданий на двух террасах, вода и залив за ними, "
            "метеоплощадка слева внизу, площадь с фонарями внизу. Оперативный зал в центре — самый яркий.",
    prompt="Wide 16:9 view of a cozy meteorological research campus at night on the Gulf of Finland shore. Two terraces: "
           "back row of four buildings (radar tower with white dome far left, cartography classroom, archive with tall "
           "windows, aerology pavilion with a balloon hangar far right), front row with a large glass operations hall in the "
           "centre glowing warmly and a tournament hall on the right. Behind: calm water and a distant low city skyline "
           "with tiny lights. Bottom-left: fenced weather observation plot with a white louvered instrument screen and an "
           "anemometer mast. Bottom: paved plaza with lamps, birch and pine framing the edges.",
    post="Это эталон композиции, а не рабочий слой; рабочие слои — HUB-*, BLD-*.")
add("KF-03", "W1-06", KF + "kf-03-hub-day.png", "Хаб днём", (480, 270), alpha="opaque", max_colors=64,
    ramps=("day", "water", "facade", "stone", "foliage", "birch_snow"), group=G,
    content="Та же композиция, что KF-02, ясный летний день: окна почти не светятся, короткие тени, облака отбрасывают тени на двор.",
    prompt="Same campus composition as the night keyframe but on a clear summer day: soft blue sky with a few cumulus "
           "clouds, short shadows to the lower-right, windows dark, cloud shadows on the lawns, sparkling water.")
add("KF-04", "W1-06", KF + "kf-04-codepost-task.png", "Кодовый пост во время задания", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "window", "facade", "stone", "paper", "ink", "ui_teal", "accent"), group=G,
    content="Интерьер поста ночью (см. ROOM-CODEPOST-SHELL) с наложенным интерфейсом-заглушкой: длинная бумажная лента через верхнюю треть, "
            "бумажный бланк в центре, портрет наставника слева внизу, мини-схема станции справа, янтарная кнопка «Проверить». "
            "Все тексты — серые полосы-заглушки.",
    must_not="Не генерировать буквы; текст обозначается полосами.",
    prompt="Cozy night interior of a small teletype code room at a weather station, warm desk lamp light. Overlaid flat "
           "pixel UI mock-up: a long cream paper telegram tape with perforated edges across the upper third, a cream paper "
           "form card in the centre with grey placeholder bars instead of text, a small framed character portrait at "
           "bottom-left, a small square panel at right, one amber button at the bottom of the form.")
add("KF-05", "W1-06", KF + "kf-05-error-breakdown.png", "Разбор ошибки по цифрам", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "paper", "ink", "marks", "ui_teal", "accent"), group=G,
    content="Крупный бланк разбора: пять ячеек цифр (пустые прямоугольники), под ними скобки-подписи (полосы), одна ячейка обведена красным карандашом, "
            "справа зачёркнутая и правильная интерпретация (полосы).",
    prompt="Close-up of a cream paper worksheet on a dark desk: five empty square digit cells in a row, small brackets "
           "under groups of cells, one cell circled with a hand-drawn red pencil ellipse, grey placeholder bars for text, "
           "a green ink rubber-stamp mark in the corner.")
add("KF-06", "W1-06", KF + "kf-06-shift-summary.png", "Сводка смены", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "paper", "ink", "accent", "state", "ui_teal"), group=G,
    content="Планшет с зажимом и листом журнала: заголовок-полоса, три крупных числовых блока (пустые), 5 полос освоения разной длины, "
            "блок награды с иконкой карандаша, подпись-росчерк, две кнопки внизу.",
    prompt="A clipboard with a cream logbook sheet on a dark wooden desk at night: a title placeholder bar, three empty "
           "stat boxes, five horizontal progress bars of different lengths in green, a small reward box with a pencil icon, "
           "a hand-written signature scribble, two buttons at the bottom (one amber, one teal).")
add("KF-07", "W1-06", KF + "kf-07-unlock.png", "Разблокировка здания", (480, 270), alpha="opaque", max_colors=64,
    ramps=("night", "window", "facade", "stone", "foliage", "water"), group=G,
    content="Хаб ночью, кадр приближен к Картографическому классу: половина окон загорелась, раскрытый замок над входом, три голубя взлетают с крыши.",
    prompt="Night close-up of a two-storey ochre classroom building on a campus terrace: windows lighting up one by one "
           "from left to right (half lit, half dark), a small opened padlock icon floating above the entrance, three pigeons "
           "taking off from the roof, calm water behind.")

# ---------------------------------------------------------------- хаб: слои
H = "assets/source/environment/hub/v3/"
G = "Хаб: слои сцены (480×270)"
for phase, ramp, desc in (
    ("night", "night", "ночь: от #070D1E вверху к #263B66 у горизонта, 2 полосы дизеринга"),
    ("dawn", "twilight", "рассвет: вверху #263B66, к горизонту #7A4C80 → #E08A7A → #F4B98A"),
    ("day", "day", "день: вверху #5E8FC4, к горизонту #C4DDF0"),
    ("golden", "twilight", "золотой час: вверху #8DB7DE, к горизонту #F4B98A и #E6C07A"),
    ("dusk", "twilight", "сумерки: вверху #18284D, середина #4B3A6E, у горизонта #B2607F"),
    ("whitenight", "twilight", "белая ночь (июнь): вверху #3A5383, к горизонту светлый #C4DDF0 и #F4B98A, без звёзд"),
):
    add(f"HUB-L0-SKY-{phase.upper()}", "W2-10", H + f"hub_l0_sky_{phase}.png", f"Небо: {phase}", (480, 270),
        alpha="opaque", max_colors=10, ramps=(ramp, "night", "day"), group=G, place="Слой L0, весь кадр; виден участок y 0–100",
        content=f"Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: {desc}. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.",
        prompt="Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, "
               "no stars, no sun, no ground. " + desc.split(":", 1)[1])
add("HUB-L0-CELESTIAL", "W2-10", H + "hub_l0_celestial.png", "Солнце и луна", (48, 16), frame=(16, 16), max_colors=8,
    ramps=("window", "birch_snow", "stone"), group=G, layout="1 ряд × 3 кадра: солнце, полная луна, растущий месяц",
    pivot="центр кадра", content="Диски 10–12 px в кадре 16×16, без лучей и ореолов; луна с 2–3 пятнами морей.",
    prompt="Three tiny pixel sprites side by side on transparent background: a warm sun disc, a full moon with two "
           "subtle maria, a crescent moon. No glow, no rays.",
    post="Звёзды рисуются кодом (точки 1×1); отдельный ассет не нужен.")
add("HUB-L1-CLOUDS-FAR", "W2-10", H + "hub_l1_clouds_far.png", "Дальние облака", (256, 32), frame=(64, 32), max_colors=6,
    ramps=("stone", "birch_snow"), group=G, layout="1 ряд × 4 варианта облаков", place="Слой L1, y 20–80, дрейф",
    content="Четыре разных плоских слоистых облака, 3 тона: тень #8D939C, тело #B9BDC2, верх #E9E4D6. Тонирование по фазе суток делает код.",
    prompt="Four separate flat stratocumulus cloud sprites in a row, each fits a 64x32 cell, three flat tones (shadow, "
           "body, highlight), soft pixel-cluster edges, transparent background.")
add("HUB-L2-HORIZON", "W2-10", H + "hub_l2_horizon.png", "Горизонт: залив, город, лес", (480, 270), max_colors=20,
    ramps=("night", "water", "stone", "foliage"), group=G, place="Слой L2; содержимое только в полосе y 70–104, остальное прозрачно",
    content="Полоса воды залива y 96–104 (#22566F/#3E7C93), за ней низкий силуэт города y 74–96: ряды крыш, 2–3 купола и 1–2 тонких шпиля "
            "без узнаваемых реальных зданий, слева тёмная кромка леса. Цвета дальнего плана — холодные, низкий контраст.",
    must_not="Не рисовать узнаваемые достопримечательности (Петропавловский шпиль, Исаакий, Лахта-центр).",
    prompt="Distant low city skyline silhouette across a calm bay, very low contrast cool blue tones, rows of roofs with a "
           "couple of small domes and thin spires (generic, not recognisable landmarks), dark forest edge on the left, "
           "a thin strip of water in front. Everything else transparent.")
add("HUB-L2-CITYLIGHTS", "W2-10", H + "hub_l2_citylights.png", "Огни города", (960, 270), frame=(480, 270), max_colors=4,
    ramps=("window",), group=G, layout="1 ряд × 2 кадра (мерцание)", fps="1 кадр/с",
    content="Только огни — точки 1×1 и пары 2×1 цветами #FFC768/#FFE7A0, строго поверх силуэта HUB-L2-HORIZON; во втором кадре 15% огней погашены/переставлены.",
    prompt="Only tiny warm city light dots (single pixels and pairs) placed along a distant skyline band, two frames for "
           "flicker, everything else transparent.")
add("HUB-L3-WATER", "W2-10", H + "hub_l3_water.png", "Вода у набережной", (480, 96), frame=(480, 24), max_colors=6,
    ramps=("water",), group=G, layout="4 ряда × 1 кадр (анимация бликов)", fps="3 кадр/с", place="Слой L3, y 100–124",
    content="Полоса воды 24 px: основной #143A52, полосы #22566F, блики 2–6 px #3E7C93/#8DBFCF; в каждом кадре блики смещены, цикл бесшовный.",
    prompt="A horizontal band of calm dark water seen from above at low angle, short horizontal highlight dashes, four "
           "animation frames stacked vertically for a seamless shimmer loop.")
add("HUB-L4-FOG", "W2-10", H + "hub_l4_fog.png", "Туман над водой", (480, 96), frame=(480, 32), max_colors=3,
    ramps=("birch_snow", "stone"), group=G, layout="3 ряда: три варианта полос тумана", place="Слой L4, рассвет",
    content="Горизонтальные полосы дизеринга 2×2 цветами #E9E4D6 и #B9BDC2 на прозрачном фоне; плотность 25–50%.",
    prompt="Three variations of thin horizontal morning fog strips made only of 2x2 ordered dither pattern, transparent "
           "background, stacked vertically.")
add("HUB-L6-GROUND", "W2-10", H + "hub_l6_ground.png", "Земля, террасы, дорожки, метеоплощадка", (480, 270), max_colors=32,
    ramps=("stone", "foliage", "birch_snow", "facade"), group=G, place="Слой L6; содержимое y 118–270",
    content="Гранитная набережная y 118–126; верхняя терраса y 126–152 (газон, дорожка, низкие кусты), подпорная стена и две лестницы; "
            "нижняя терраса y 152–200; метеоплощадка x 24–140, y 196–236: квадрат светлого гравия #B9BDC2 с низким белым штакетником; "
            "площадь y 230–270 мощёная (#656C78/#8D939C), клумба по центру. Места под здания (см. §2.3) — ровная земля без деталей.",
    must_not="Не рисовать здания, фонари, деревья выше 12 px, людей.",
    prompt="Top part transparent. Lower part: granite embankment edge, two landscaped terraces with lawns, low shrubs, "
           "stone retaining walls and two stairways, a paved plaza at the bottom with a round flowerbed, and on the "
           "lower-left a small square of light gravel fenced with a low white picket fence (weather observation plot). "
           "Flat empty ground where buildings will be placed. Slight top-down 3/4 view, consistent across the image.")
add("HUB-L9-FG-BIRCH", "W2-10", H + "hub_l9_fg_birch.png", "Берёза переднего плана (слева)", (144, 200), frame=(72, 200),
    max_colors=12, ramps=("birch_snow", "foliage"), group=G, layout="1 ряд × 2 кадра (покачивание)", fps="2 кадр/с",
    place="Левый край кадра, x 0–72, y 70–270", pivot="низ ствола",
    content="Ствол белый с тёмными чечевичками, свисающие ветви; во втором кадре крона смещена на 1 px.",
    prompt="Foreground birch tree hugging the left frame edge, white trunk with dark marks, drooping branches with small "
           "leaf clusters, two frames with a 1-pixel sway, transparent background.")
add("HUB-L9-FG-PINE", "W2-10", H + "hub_l9_fg_pine.png", "Сосна переднего плана (справа)", (144, 200), frame=(72, 200),
    max_colors=12, ramps=("foliage", "facade", "stone"), group=G, layout="1 ряд × 2 кадра", fps="2 кадр/с",
    place="Правый край, x 408–480", pivot="низ ствола",
    content="Рыжий ствол (#9A5838), тёмная хвоя ярусами.",
    prompt="Foreground Scots pine hugging the right frame edge, orange-brown trunk, dark layered needle clumps, two frames "
           "with a 1-pixel sway, transparent background.")
add("HUB-L10-WEATHER", "W2-10", H + "hub_l10_weather.png", "Частицы снега и дождя", (32, 8), frame=(8, 8), max_colors=4,
    ramps=("birch_snow", "water"), group=G, layout="1 ряд × 4: снежинка 1×1, снежинка 2×2, капля 1×3, капля 1×4",
    content="Крошечные частицы для системы частиц.", prompt="Four tiny particle sprites: 1px snowflake, 2x2 snowflake, 1x3 raindrop, 1x4 raindrop.",
    post="Можно нарисовать вручную за минуту; генерация не нужна.")

# ---------------------------------------------------------------- здания
B = "assets/source/environment/hub/v3/buildings/"
G = "Хаб: здания (слой L5)"
BUILDINGS = (
    ("synoptic", "Оперативный зал (кодовый пост)", (128, 84), "центр, нижний ряд, основание по центру x=240, y=200",
     "Двухэтажный павильон с большой стеклянной стеной-витриной, сквозь которую видны столы и карты; плоская кровля с антеннами; "
     "широкий вход по центру с козырьком. Самое тёплое и приветливое здание.",
     "Two-storey glass-fronted operations pavilion, large window wall showing desks and wall maps inside, flat roof with "
     "small antennas, wide central entrance with a canopy, welcoming and modern-Soviet-scientific."),
    ("cartography", "Картографический класс", (88, 64), "задний ряд, основание x=136, y=152",
     "Двухэтажное охристое здание с высокими окнами и треугольным фронтоном, над входом небольшой круглый глобус-флюгер.",
     "Two-storey ochre classroom building with tall windows, a small pediment, a little globe finial above the entrance."),
    ("archive", "Научный архив", (88, 64), "задний ряд, основание x=344, y=152",
     "Терракотовое кирпичное здание с арочными окнами, тяжёлой дверью и коробками за окнами первого этажа.",
     "Terracotta brick archive building with arched windows, a heavy wooden door, shelves with boxes visible through "
     "ground-floor windows."),
    ("radar", "Радарный комплекс", (56, 96), "задний ряд, крайний левый, основание x=52, y=152",
     "Бетонная башня с белым радиопрозрачным куполом наверху, на крыше вспомогательного блока — открытая вращающаяся антенна (отдельный ассет PROP-RADAR-ANTENNA), красный огонь на верхушке.",
     "Concrete tower topped with a white geodesic radome, small service block at its base, red obstruction light point on top."),
    ("aerology", "Аэрологический павильон", (72, 80), "задний ряд, крайний правый, основание x=432, y=152",
     "Невысокий ангар с широкими воротами для выпуска зондов, рядом решётчатая мачта, на крыше белый шар-зонд в сетке.",
     "Low hangar-like pavilion with wide doors for radiosonde balloon launches, a lattice mast beside it, a white balloon "
     "resting in a net on the roof."),
    ("tournament", "Турнирный зал", (112, 64), "нижний ряд справа, основание x=392, y=204",
     "Одноэтажный зал с полукруглой кровлей, флажками команд (без символики) и широкими окнами.",
     "One-storey hall with a barrel-vault roof, row of wide windows, small plain team pennants without symbols."),
)
for bid, title, size, place, ru, en in BUILDINGS:
    for variant, alpha_note, light in (
        ("day", "дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE)",
         "daylight, dark window glass with a sky reflection"),
        ("night", "ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45",
         "night, walls in cool shadow, most windows glowing warm amber"),
    ):
        add(f"BLD-{bid.upper()}-{variant.upper()}", "W2-10", B + f"bld_{bid}_{variant}.png", f"{title}: {variant}", size,
            max_colors=28, ramps=("facade", "stone", "window", "night" if variant == "night" else "day", "foliage"), group=G,
            pivot="низ по центру", place=place, content=f"{ru} Вариант: {alpha_note}.",
            must_not="Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.",
            prompt=f"Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus "
                   f"perspective: {en}. Lighting: {light}.",
            post="Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.")
    add(f"BLD-{bid.upper()}-WINDOWS", "W2-11", B + f"bld_{bid}_windows.png", f"{title}: маска окон", size, max_colors=4,
        ramps=("window",), group="Хаб: состояния зданий", pivot="низ по центру", place=place,
        content="Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. "
                "Используется для анимации «окна загораются по одному».",
        prompt="Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night "
               "sprite, everything else transparent.",
        post="Проще всего вырезать из ночного варианта вручную.")

# ---------------------------------------------------------------- состояния и пропсы
G = "Хаб: состояния зданий"
S = "assets/source/ui/location-states/v3/"
add("STATE-LOCK", "W2-11", S + "state_lock.png", "Замок над входом (раскрытие)", (28, 8), frame=(7, 8), max_colors=5,
    ramps=("accent", "stone"), group=G, layout="1 ряд × 4: закрыт → дужка поднимается → открыт → открыт и гаснет", fps="8 кадр/с",
    pivot="низ по центру", prompt="Tiny brass padlock icon, 4 frames: closed, shackle lifting, open, open fading.")
add("STATE-BEACON", "W2-11", S + "state_beacon.png", "Маячок доступной цели", (15, 5), frame=(5, 5), max_colors=3,
    ramps=("accent",), group=G, layout="1 ряд × 3 кадра пульса", fps="2,5 кадр/с", pivot="центр",
    prompt="Tiny 5x5 four-pointed amber star, 3 pulse frames (small, medium, large).")
for bid, title in (("cartography", "Картографический класс"), ("archive", "Архив"), ("radar", "Радар"),
                   ("aerology", "Аэрология"), ("tournament", "Турнирный зал")):
    add(f"SCR-SILHOUETTE-{bid.upper()}", "W2-11", S + f"silhouette_{bid}.png", f"Силуэт интерьера: {title}", (96, 64),
        alpha="opaque", max_colors=6, ramps=("ui_teal", "night"), group=G,
        content="Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.",
        prompt=f"Monochrome dark-teal silhouette illustration of the interior of a {title} at a weather station, "
               f"recognisable furniture and instruments, two tones only, mysterious but friendly.")

P = "assets/source/props/hub/"
G = "Хаб: пропсы (слой L7)"
add("PROP-LAMP", "W2-10", P + "prop_lamp.png", "Фонарь", (16, 24), frame=(8, 24), max_colors=8, ramps=("stone", "window"),
    group=G, layout="1 ряд × 2: выключен, включён", pivot="низ по центру",
    prompt="Old-style park street lamp on a thin dark pole, 2 frames: off, on (warm lamp head).")
add("PROP-LAMP-GLOW", "W2-10", P + "prop_lamp_glow.png", "Световое пятно фонаря", (32, 32), max_colors=3, ramps=("window",),
    group=G, pivot="центр", content="Конус и пятно на земле из дизеринга 2×2 в 3 ступени #FFE7A0→#FFC768→#F29F45, без полупрозрачности.",
    prompt="Pool of warm lamp light on the ground made only of ordered dither pattern in three rings, transparent background.")
add("PROP-BENCH", "W2-10", P + "prop_bench.png", "Скамейка", (16, 10), max_colors=6, ramps=("facade", "stone"), group=G,
    pivot="низ по центру", prompt="Small wooden park bench with cast-iron legs, 3/4 view.")
add("PROP-STEVENSON", "W2-10", P + "prop_stevenson.png", "Метеобудка", (24, 16), frame=(12, 16), max_colors=6,
    ramps=("birch_snow", "stone"), group=G, layout="1 ряд × 2: дверца закрыта, открыта", pivot="низ по центру",
    content="Белая жалюзийная будка на четырёх ножках (психрометрическая будка).",
    prompt="White louvered meteorological instrument shelter (Stevenson screen) on four legs, 2 frames: door closed, door open.")
add("PROP-ANEMOMETER", "W2-10", P + "prop_anemometer.png", "Мачта с анемометром", (32, 40), frame=(8, 40), max_colors=6,
    ramps=("stone", "birch_snow"), group=G, layout="1 ряд × 4 кадра вращения чашек", fps="6 кадр/с", pivot="низ по центру",
    prompt="Thin weather mast with a cup anemometer on top, 4 frames of cup rotation.")
add("PROP-FLAG", "W2-10", P + "prop_flag.png", "Ветроуказатель-конус", (72, 8), frame=(12, 8), max_colors=4,
    ramps=("state", "birch_snow"), group=G, layout="1 ряд × 6 кадров колыхания", fps="6 кадр/с", pivot="левый край по центру",
    content="Полосатый ветровой конус (бело-оранжевый #F4F7FA/#D89A52), без государственной символики.",
    prompt="Striped orange and white wind sock, 6 frames of gentle flapping, attached at the left edge.")
add("PROP-RADAR-ANTENNA", "W2-10", P + "prop_radar_antenna.png", "Вращающаяся антенна", (192, 16), frame=(24, 16),
    max_colors=5, ramps=("stone", "birch_snow"), group=G, layout="1 ряд × 8 положений поворота", fps="4 кадр/с", pivot="низ по центру",
    prompt="Small open parabolic radar antenna on a pedestal, 8 frames of a full rotation, side view.")
add("PROP-BEACON-LIGHT", "W2-10", P + "prop_beacon_light.png", "Красный огонь мачты", (6, 3), frame=(3, 3), max_colors=2,
    ramps=("state",), group=G, layout="1 ряд × 2: погашен, горит", pivot="центр",
    content="#D65E5E и тёмный #6B3A2C.", prompt="Tiny 3x3 red obstruction light, off and on.", post="Рисуется вручную.")
add("PROP-SIGNPOST", "W2-10", P + "prop_signpost.png", "Указатель станции", (16, 24), max_colors=6, ramps=("stone", "ui_teal"),
    group=G, pivot="низ по центру", content="Столбик с пустой табличкой 14×6.",
    must_not="Не генерировать цифры: «26063» наносится вручную шрифтом Press Start 2P 8 px.",
    prompt="Small station signpost with a blank teal plate, no text.")
add("PROP-BICYCLE", "W2-10", P + "prop_bicycle.png", "Велосипед у стойки", (18, 11), max_colors=6, ramps=("stone", "ui_teal"),
    group=G, pivot="низ по центру", prompt="Simple city bicycle leaning on a stand, side view.")

# ---------------------------------------------------------------- кодовый пост
R = "assets/source/environment/rooms/codepost/"
G = "Интерьер «Кодовый пост» (семейство M2)"
add("ROOM-CODEPOST-SHELL", "W2-12", R + "room_codepost_shell.png", "Комната поста (статичная основа)", (480, 270),
    alpha="opaque", max_colors=48, ramps=("night", "facade", "stone", "paper", "ink", "window", "ui_teal"), group=G,
    content="Вид спереди, слегка сверху. Стены приглушённо-бирюзовые снизу (панели) и охристые сверху; деревянный пол. "
            "Слева окно x 24–120, y 40–112 (проём залить #18284D — туда кладётся ROOM-WINDOW-VIEW). Центр: большой стол x 150–330, столешница y 170. "
            "Место под телетайп x 190–286, y 106–170 пустое. Справа: шкаф с книгами и архивными коробками x 360–460, "
            "место под барограф на полке x 372–412, y 120–148, место под часы на стене x 300–364, y 30–70. На стене за столом приколота бланковая карта.",
    must_not="Без людей, кота, телетайпа, часов, лампы и барографа — они отдельные анимированные ассеты. Без надписей на коробках.",
    prompt="Cozy small teletype code room at a weather station at night, front view slightly from above. Teal wainscot "
           "panels, ochre upper walls, wooden floor. A window on the left (empty dark pane), a large wooden desk in the "
           "centre with an empty space on top, a bookcase with archive boxes on the right, a blank weather map pinned on "
           "the wall. Warm but dim lighting.")
add("ROOM-WINDOW-VIEW", "W2-12", R + "room_window_view.png", "Вид из окна по фазам", (480, 72), frame=(96, 72),
    alpha="opaque", max_colors=24, ramps=("night", "twilight", "day", "foliage", "water"), group=G,
    layout="1 ряд × 5: ночь, рассвет, день, золотой час, сумерки", place="В проём окна x 24–120, y 40–112",
    content="Двор кампуса и вода: ветка берёзы, крыша соседнего здания, подоконник снаружи (на него садится синица).",
    prompt="Five versions of the same small view through a window: a campus roof, a birch branch and water, shown at "
           "night, dawn, day, golden hour and dusk.")
add("ROOM-WINDOW-RAIN", "W2-12", R + "room_window_rain.png", "Дождь по стеклу", (384, 72), frame=(96, 72), max_colors=3,
    ramps=("water",), group=G, layout="1 ряд × 4 кадра", fps="6 кадр/с",
    prompt="Overlay of raindrops and short streaks on window glass, 4 frames, transparent background.")
add("ROOM-TELETYPE", "W2-12", R + "room_teletype.png", "Телетайп", (384, 128), frame=(96, 64), max_colors=16,
    ramps=("ui_teal", "stone", "paper", "ink"), group=G, layout="ряд 1: покой (1 кадр, остальные ячейки пусты); ряд 2: печать, 4 кадра",
    fps="12 кадр/с при печати", pivot="низ по центру", place="На столе x 190–286, y 106–170",
    content="Массивный аппарат цвета морской волны с клавиатурой, рулон бумаги сзади, лента выходит сверху; при печати двигается каретка и подаётся лента.",
    must_not="Без букв на клавишах (только светлые прямоугольники).",
    prompt="Vintage mid-century teletype machine in muted teal-green enamel on a desk, keyboard with blank keys, paper "
           "roll at the back, paper tape coming out on top. Row 1: idle frame. Row 2: four printing frames with the "
           "carriage moving and tape advancing.")
add("ROOM-BAROGRAPH", "W2-12", R + "room_barograph.png", "Барограф", (160, 28), frame=(40, 28), max_colors=10,
    ramps=("facade", "stone", "paper", "ink"), group=G, layout="1 ряд × 4: барабан поворачивается", fps="по таймеру раз в 30 с",
    pivot="низ по центру", prompt="Recording barograph instrument in a wooden case with glass cover, rotating paper drum "
                                  "with a pen trace, 4 frames of slow drum rotation.")
add("ROOM-CLOCK", "W2-12", R + "room_clock.png", "Настенные часы UTC и местного времени", (64, 40), max_colors=8,
    ramps=("stone", "paper", "ink"), group=G, pivot="центр", place="Стена x 300–364, y 30–70",
    content="Двойные часы: два круглых циферблата в общем корпусе, деления рисками, без цифр и стрелок (стрелки — отдельный ассет).",
    prompt="Wall-mounted double clock with two round dials in one dark case, tick marks only, no numbers, no hands.")
add("ROOM-CLOCK-HANDS", "W2-12", R + "room_clock_hands.png", "Секундная стрелка", (128, 16), frame=(16, 16), max_colors=2,
    ramps=("ink", "marks"), group=G, layout="1 ряд × 8 положений", pivot="центр", post="Рисуется вручную.")
add("ROOM-LAMP", "W2-12", R + "room_lamp.png", "Настольная лампа", (72, 32), frame=(24, 32), max_colors=8,
    ramps=("ui_teal", "window", "stone"), group=G, layout="1 ряд × 3: выключена, мерцание, включена", pivot="низ по центру",
    prompt="Green-shaded desk lamp, 3 frames: off, flickering, on.")
add("ROOM-LAMP-GLOW", "W2-12", R + "room_lamp_glow.png", "Пятно света лампы", (64, 48), max_colors=3, ramps=("window",),
    group=G, pivot="верх по центру", content="Дизеринг 2×2 в 3 ступени на прозрачном фоне.",
    prompt="Warm dithered light pool cast by a desk lamp on a desk surface, three dither rings, transparent background.")

# ---------------------------------------------------------------- фауна
A = "assets/source/animals/"
G = "Фауна"
FAUNA = (
    ("TIT-M1", "tit/tit_m1.png", "Большая синица (двор)", (8, 8), 4,
     "idle 4 (4/с), поворот головы 2, прыжок 4 (10/с), клюёт 3 (8/с), взлёт 4 (12/с), полёт 4 (10/с)", 6, 8,
     "Great tit: yellow belly with black stripe, black head with white cheeks, olive back."),
    ("TIT-M2", "tit/tit_m2.png", "Большая синица (подоконник поста)", (16, 16), 4,
     "idle 4, поворот головы 2, прыжок 4, клюёт 3, взлёт 4, полёт 4", 6, 10,
     "Great tit, slightly larger and more detailed."),
    ("SPARROW-M1", "sparrow/sparrow_m1.png", "Воробей", (8, 8), 3, "прыжок 3, клюёт 3, взлёт 3", 3, 6,
     "House sparrow: brown streaked back, grey crown, pale belly."),
    ("GULL-M1", "gull/gull_m1.png", "Чайка", (16, 8), 4, "парение 4 (6/с), взмахи 4 (8/с)", 2, 6,
     "Herring gull in flight: white body, grey wings with dark tips."),
    ("MALLARD-M1", "mallard/mallard_m1.png", "Кряква (пара на воде)", (12, 8), 6, "плывёт 4 (4/с), ныряет 6 (8/с)", 2, 8,
     "Mallard drake on water: green head, white collar, brown chest, side view, with a waterline."),
    ("SQUIRREL-M1", "squirrel/squirrel_m1.png", "Белка (двор)", (12, 8), 6, "бег 6 (12/с), сидит 4 (4/с), прячет орех 6 (8/с)", 3, 6,
     "Red squirrel with a bushy tail and ear tufts."),
    ("SQUIRREL-M2", "squirrel/squirrel_m2.png", "Белка (крупно)", (32, 24), 6, "бег 6, сидит 4, прячет орех 6", 3, 10,
     "Red squirrel with a bushy tail and ear tufts, more detail."),
    ("CAT-M1", "cat/cat_m1.png", "Кот Барограф (двор)", (12, 8), 6,
     "сон 4 (2/с), поднимает голову 3, потягивается 6 (8/с), умывается 6 (6/с), идёт 6 (8/с), хвост 3 (4/с)", 6, 8,
     "Grey tabby cat with a white chest and white paws, chunky and calm."),
    ("CAT-M2", "cat/cat_m2.png", "Кот Барограф (на телетайпе)", (32, 20), 6,
     "сон 4, поднимает голову 3, потягивается 6, умывается 6, идёт 6, хвост 3", 6, 12,
     "Grey tabby cat with a white chest and white paws, detailed, lying on top of a machine in the sleep frames."),
    ("PIGEON-M1", "pigeon/pigeon_m1.png", "Голубь", (8, 8), 4, "сидит 2, взлёт 4, полёт 4", 3, 6,
     "Rock pigeon: blue-grey body, iridescent neck hint, dark wing bars."),
    ("BULLFINCH-M1", "bullfinch/bullfinch_m1.png", "Снегирь (зима)", (8, 8), 4, "покой 4, прыжок 4, полёт 4", 3, 6,
     "Eurasian bullfinch male: rose-red breast, black cap, grey back."),
    ("FLOCK-FAR", "flock/flock_far.png", "Дальняя стая", (16, 8), 4, "полёт стаи 4 (8/с)", 1, 3,
     "Group of five tiny distant bird silhouettes, 2-3 px each, in a loose V."),
)
for fid, rel, title, frame, cols, states, rows, colors, en in FAUNA:
    add(fid, "W2-13", A + rel, title, (frame[0] * cols, frame[1] * rows), frame=frame, max_colors=colors,
        ramps=("stone", "birch_snow", "facade", "foliage", "window", "night"), group=G,
        layout=f"{rows} ряд(ов) × {cols} колонок; ряды = состояния: {states}; пустые ячейки прозрачны",
        pivot="лапы/низ тела по центру кадра, одинаковый во всех кадрах", content=f"{title}. Состояния: {states}.",
        prompt=f"Pixel art animation sprite sheet on transparent background, {rows} rows (one row per animation state, "
               f"left to right frames) and {cols} columns, each cell exactly {frame[0]}x{frame[1]} pixels, side view: {en}",
        post="Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.")
add("FX-RIPPLE", "W2-19", "assets/source/effects/fx_ripple.png", "Круги на воде", (36, 4), frame=(12, 4), max_colors=2,
    ramps=("water",), group="Эффекты", layout="1 ряд × 3", pivot="центр",
    prompt="Three frames of a small expanding water ripple ellipse seen from low angle.")

# ---------------------------------------------------------------- персонажи
C = "assets/source/characters/"
G = "Персонажи"
add("MENTOR-PORTRAIT", "W2-14", C + "npc/mentor_portrait.png", "Вера Павловна Ладожская: портрет", (384, 192), frame=(64, 64),
    max_colors=24, ramps=("people", "ui_teal", "birch_snow", "ink"), people=True, group=G,
    layout="ряд 1: 6 выражений (нейтрально, улыбка, задумчивость, удивление, одобрение, строгость); ряд 2: кивок 4 кадра; ряд 3: очки на лоб 3 кадра",
    pivot="низ по центру (плечи)",
    content="Женщина 55–60 лет, ведущий синоптик: седые волосы (#9A9AA4) в аккуратном пучке, очки в тонкой оправе, тёмно-бирюзовый кардиган поверх светлой блузки, "
            "спокойное умное лицо, лёгкая улыбка. Голова и плечи, вид 3/4 вправо.",
    must_not="Не карикатура, не военная форма, без бейджей с надписями.",
    prompt="Character portrait sheet, head and shoulders, 3/4 view facing right: a kind, intelligent senior woman "
           "meteorologist in her late fifties, grey hair in a neat bun, thin-rimmed glasses, dark teal cardigan over a light "
           "blouse. Row 1: six expressions (neutral, smile, thoughtful, surprised, approving, stern). Row 2: four frames of a "
           "nod. Row 3: three frames of pushing glasses up onto the forehead. Consistent face across all frames.")
add("MENTOR-M1", "W2-14", C + "npc/mentor_m1.png", "Наставник: фигура в хабе", (72, 48), frame=(12, 24), max_colors=12,
    ramps=("people", "ui_teal", "stone"), people=True, group=G, layout="ряд 1: стоит 4 кадра; ряд 2: идёт вбок 6 кадров (вправо, влево — отражением)",
    pivot="между ступнями", prompt="Tiny 12x24 walking sprite of the same senior woman meteorologist (grey bun, teal cardigan), side view.")
add("TECH-M1", "W2-14", C + "npc/tech_semyon_m1.png", "Семён, техник метеоплощадки", (72, 72), frame=(12, 24), max_colors=12,
    ramps=("people", "ui_teal", "stone", "state"), people=True, group=G,
    layout="ряд 1: идёт 6; ряд 2: открывает будку 6; ряд 3: записывает в журнал 6", pivot="между ступнями",
    content="Мужчина 30 лет, оранжевая рабочая куртка поверх серого, вязаная шапка, планшет-журнал в руке.",
    prompt="Tiny 12x24 sprite of a young male weather technician in an orange work jacket and knitted hat holding a "
           "logbook. Row 1 walk cycle, row 2 opening an instrument shelter, row 3 writing in the logbook. Side view.")
add("LAB-M1", "W2-14", C + "npc/lab_assistant_m1.png", "Лаборантка с папкой", (72, 48), frame=(12, 24), max_colors=12,
    ramps=("people", "birch_snow", "facade"), people=True, group=G,
    layout="ряд 1: идёт 6; ряд 2: роняет лист 4", pivot="между ступнями",
    content="Молодая женщина в белом халате с синей папкой, тёмный хвост волос.",
    prompt="Tiny 12x24 sprite of a young female lab assistant in a white lab coat carrying a blue folder, dark ponytail. "
           "Row 1 walk cycle, row 2 dropping a sheet of paper. Side view.")
add("AVATAR-BASE-M1", "W2-15", C + "avatar/avatar_base_m1.png", "Аватар: база (двор)", (72, 96), frame=(12, 24), max_colors=10,
    ramps=("people", "stone"), people=True, group=G,
    layout="ряд 1: идёт вниз 6; ряд 2: идёт вверх 6; ряд 3: идёт вбок 6; ряд 4: стоит вбок 4", pivot="между ступнями",
    content="Нейтральное тело стажёра в базовой серой футболке и тёмных брюках; кожа строго #F2C9A8/#D9A07E, волосы #2B211C — "
            "они заменяются кодом на выбранные тона. Голова 6 px, без сложных деталей.",
    prompt="Tiny 12x24 neutral base character for a modular avatar system: plain grey t-shirt, dark trousers, short dark "
           "hair, four-direction walk sheet (down, up, side) plus side idle. Clean readable silhouette.",
    post="Слои одежды CLOTH-*-M1 рисуются по этой же сетке и точке опоры.")
add("AVATAR-BASE-M2", "W2-15", C + "avatar/avatar_base_m2.png", "Аватар: база (комната)", (192, 288), frame=(32, 48), max_colors=14,
    ramps=("people", "stone"), people=True, group=G,
    layout="ряд 1: стоит анфас 4; ряд 2: идёт вбок 6; ряд 3: работает за телетайпом сидя, вид сбоку вправо 6; ряд 4: думает 4; ряд 5: радуется сидя 6; ряд 6: ошибся 4",
    pivot="между ступнями (сидя — центр сиденья)",
    content="То же нейтральное тело в масштабе 32×48. Сидячие ряды — без стула (стул рисуется в комнате).",
    prompt="32x48 neutral base character sprite sheet for a modular avatar: plain grey t-shirt, dark trousers, short dark "
           "hair. Rows: front idle (4), side walk (6), seated typing at a machine seen from the side facing right (6), "
           "thinking with hand on chin (4), small seated celebration (6), small seated disappointment (4).")
add("SCR-WARDROBE-BG", "W2-15", "assets/source/environment/rooms/wardrobe/wardrobe_bg.png", "Склад формы (фон S04)", (480, 270),
    alpha="opaque", max_colors=40, ramps=("facade", "ui_teal", "stone", "window", "paper"), group=G,
    content="Тёплая комната выдачи формы: слева круглый подиум с местом под персонажа, справа стеллажи с полками-ячейками (пустыми), вешалки, зеркало, лампа.",
    prompt="Cozy uniform storeroom at a weather station: a round low podium on the left, wooden shelving with empty "
           "cubbies on the right, coat rails, a standing mirror, a warm ceiling lamp. No people.")

CLOTHES = (
    ("top.center-jacket", "куртка центра: тёмно-бирюзовая с янтарной окантовкой", "dark teal staff jacket with amber piping"),
    ("top.hoodie", "толстовка с капюшоном, серо-синяя", "grey-blue hoodie"),
    ("top.shirt", "светлая рубашка с коротким рукавом", "light short-sleeve shirt"),
    ("top.field-jacket", "полевая куртка оливковая с карманами", "olive field jacket with pockets"),
    ("top.sweater", "вязаный свитер охристый", "ochre knitted sweater"),
    ("bottom.dark-trousers", "тёмные брюки", "dark trousers"),
    ("bottom.field-trousers", "полевые брюки с наколенниками", "field trousers with knee pads"),
    ("bottom.jeans", "синие джинсы", "blue jeans"),
    ("footwear.sneakers", "кеды светлые", "light sneakers"),
    ("footwear.boots", "походные ботинки", "hiking boots"),
    ("footwear.shoes", "закрытые туфли", "plain shoes"),
    ("headwear.cap", "кепка", "cap"),
    ("headwear.beanie", "вязаная шапка", "beanie"),
    ("headwear.scarf", "шарф", "scarf"),
    ("headwear.goggles", "защитные очки на лоб", "goggles on forehead"),
    ("held.pencil", "карандаш в руке", "pencil in hand"),
    ("held.tablet", "планшет в руке", "tablet in hand"),
    ("held.map-folder", "папка карт под мышкой", "map folder under arm"),
    ("backpack.field", "полевой рюкзак", "field backpack"),
    ("backpack.city", "городской рюкзак", "city backpack"),
    ("badge.meteo", "значок метеоролога на груди", "small meteorologist pin badge"),
    ("badge.aerology", "значок аэролога на груди", "small aerology pin badge"),
)
for item, ru, en in CLOTHES:
    slug = item.replace(".", "_")
    for scale, base, size, frame in (("M1", "AVATAR-BASE-M1", (72, 96), (12, 24)), ("M2", "AVATAR-BASE-M2", (192, 288), (32, 48))):
        add(f"CLOTH-{item}-{scale}", "W2-15", C + f"avatar/clothes/{slug}_{scale.lower()}.png", f"Одежда {item} ({scale})",
            size, frame=frame, max_colors=8, ramps=("ui_teal", "facade", "stone", "foliage", "state", "birch_snow"),
            group="Слои одежды аватара",
            layout=f"Точно та же сетка рядов и кадров, что {base}", pivot=f"как у {base}",
            content=f"Только предмет: {ru}. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.",
            prompt=f"Clothing overlay layer only ({en}) drawn exactly on top of every frame of the base avatar sheet, "
                   f"same grid, transparent everywhere else.",
            post="Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.")

# ---------------------------------------------------------------- интерфейс
U = "assets/source/ui/v3/"
G = "Интерфейсный набор v2"
NINE = "9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся"
add("UI-PANEL-DARK", "W2-16", U + "ui_panel_dark.png", "Панель тёмная", (48, 48), max_colors=6, ramps=("ui_teal",), group=G,
    layout=NINE, content="Фон #0C2A33, рамка 2 px: внешняя #143F4C, внутренний блик сверху-слева #367C8B, тень снизу-справа #0C2A33.",
    prompt="Flat dark-teal UI panel tile with a crisp 2-pixel bevelled border, for 9-slice scaling.")
add("UI-PANEL-RAISED", "W2-16", U + "ui_panel_raised.png", "Панель приподнятая", (48, 48), max_colors=6, ramps=("ui_teal",),
    group=G, layout=NINE, content="Фон #1B5660, светлая фаска #6F9E95.", prompt="Raised teal UI panel tile, 2-pixel bevel, 9-slice.")
add("UI-DIALOG", "W2-16", U + "ui_dialog.png", "Окно диалога с уголками", (48, 48), max_colors=7, ramps=("ui_teal", "accent"),
    group=G, layout=NINE, content="Как UI-PANEL-DARK + янтарные уголки-скобки 5×5 #F2C75C в каждом углу.",
    prompt="Dark teal dialog frame tile with small amber corner brackets, 9-slice.")
add("UI-PAPER-SHEET", "W2-16", U + "ui_paper_sheet.png", "Бумажный бланк", (48, 48), max_colors=5, ramps=("paper", "ink"),
    group=G, layout=NINE, content="Кремовая бумага #E2D6B6, верхняя кромка #F3ECD8, тень снизу 1 px #BFAF8A, редкие волокна.",
    prompt="Cream paper sheet tile with a subtle 1-pixel bottom shadow, clean, 9-slice.")
add("UI-PAPER-PERF", "W2-16", U + "ui_paper_perf.png", "Бланк с перфорацией", (48, 48), max_colors=5, ramps=("paper", "ink"),
    group=G, layout=NINE + "; перфорация — по верхней кромке", prompt="Cream paper tile with a perforated tear-off top edge, 9-slice.")
add("UI-CLIPBOARD", "W2-16", U + "ui_clipboard.png", "Планшет с зажимом", (160, 220), max_colors=12,
    ramps=("facade", "stone", "paper"), group=G, content="Деревянная доска, металлический зажим сверху, лист бумаги под ним (пустой).",
    prompt="Wooden clipboard with a metal clip at the top holding a blank cream sheet, front view.")
add("UI-TAPE", "W2-16", U + "ui_tape.png", "Лента телеграммы (тайл)", (32, 24), max_colors=5, ramps=("paper", "ink"), group=G,
    layout="Бесшовный тайл по горизонтали; ряд круглых отверстий 2×2 сверху и снизу с шагом 8 px",
    prompt="Seamless horizontal tile of a cream teletype paper tape with a row of small punched holes along both edges.")
add("UI-TAPE-END", "W2-16", U + "ui_tape_end.png", "Оторванный конец ленты", (16, 24), max_colors=5, ramps=("paper", "ink"),
    group=G, prompt="Torn ragged end of a cream paper tape, matching the tape tile.")
for name, title, ramp, ru in (
    ("primary", "Кнопка главная", "accent", "янтарная #F2C75C, блик #FFDD83, тень #B88626, текст будет тёмным"),
    ("secondary", "Кнопка вторичная", "ui_teal", "бирюзовая #1B5660, блик #367C8B, тень #0C2A33"),
    ("ghost", "Кнопка-призрак", "ui_teal", "без заливки, только рамка #367C8B"),
):
    add(f"UI-BTN-{name.upper()}", "W2-16", U + f"ui_btn_{name}.png", title, (48, 96), frame=(48, 16), max_colors=8,
        ramps=(ramp, "ui_teal", "stone"), group=G,
        layout="6 рядов: покой, наведение (+1 px подъём, светлее), нажатие (−1 px, фаска инвертирована), фокус (рамка #F0D476 2 px), недоступна (серая #3C4857), загрузка (3 точки)",
        content=f"{ru}. Горизонтальный 9-slice: торцы 6 px. Без текста.",
        prompt=f"Pixel UI button without text, {ru.split(',')[0]}, six states stacked vertically: idle, hover, pressed, "
               f"keyboard focus, disabled, loading.")
add("UI-KEY", "W2-16", U + "ui_key.png", "Клавиша клавиатуры телетайпа", (80, 16), frame=(16, 16), max_colors=6,
    ramps=("ui_teal", "paper", "accent"), group=G, layout="1 ряд × 5: покой, наведение, нажата, фокус, недоступна",
    content="Кремовая клавиша с тёмной фаской, без символа (символ кладёт интерфейс шрифтом).",
    prompt="Blank cream keyboard key cap, five states: idle, hover, pressed, focus, disabled.")
add("UI-CHOICE-CARD", "W2-16", U + "ui_choice_card.png", "Карточка выбора", (240, 48), frame=(48, 48), max_colors=10,
    ramps=("paper", "accent", "state", "marks"), group=G,
    layout="1 ряд × 5 (каждая 9-slice): покой, наведение, выбрана (янтарная рамка), верная (зелёная #5FAF78 + галочка), неверная (красный карандаш #B8423A)",
    prompt="Blank cream answer card tile, five states: idle, hover, selected with amber border, correct with green border "
           "and tick, wrong with red pencil cross.")
add("UI-LAMP", "W2-16", U + "ui_lamp.png", "Лампа серии", (21, 7), frame=(7, 7), max_colors=5, ramps=("stone", "accent"),
    group=G, layout="1 ряд × 3: погашена, горит, вспышка", prompt="Tiny round indicator lamp: off, lit amber, flash.")
add("UI-STAMP-RECT", "W2-16", U + "ui_stamp_rect.png", "Оттиск штампа (прямоугольный)", (192, 24), frame=(64, 24), max_colors=2,
    ramps=("marks",), group=G, layout="1 ряд × 3: оттиск слабый, полный, полный с непропечаткой",
    content="Двойная прямоугольная рамка цвета #2F6E5A с неровной пропечаткой. БЕЗ ТЕКСТА.",
    must_not="Слова «ПРИНЯТО», «ПРОВЕРИТЬ», «ДОПУСК» наносятся вручную шрифтом PixCyrillic 16 px в Aseprite.",
    prompt="Empty rubber-stamp imprint: double rectangular border in dark green ink, uneven inking, no text, three variants.")
add("UI-STAMP-ROUND", "W2-16", U + "ui_stamp_round.png", "Оттиск печати (круглый)", (96, 32), frame=(32, 32), max_colors=2,
    ramps=("marks",), group=G, layout="1 ряд × 3 варианта", content="Круглая печать с двойным кольцом, без текста; центр пустой.",
    prompt="Empty round ink seal imprint with a double ring, dark green, no text, three variants.")
add("UI-BUBBLE", "W2-16", U + "ui_bubble.png", "Пузырь реплики", (64, 32), frame=(32, 32), max_colors=4,
    ramps=("paper", "ink"), group=G, layout="1 ряд × 2: хвостик слева, хвостик снизу (9-slice)",
    prompt="Cream speech bubble tile with a dark outline, two variants: tail on the left, tail at the bottom.")
add("UI-TAB", "W2-16", U + "ui_tab.png", "Закладка справочника", (48, 32), frame=(24, 32), max_colors=6,
    ramps=("facade", "ui_teal", "paper"), group=G, layout="1 ряд × 2: неактивная, активная",
    prompt="Book bookmark tab sticking out of a page, two states: inactive (muted), active (brighter, longer).")
add("UI-PORTRAIT-FRAME", "W2-16", U + "ui_portrait_frame.png", "Рамка портрета", (72, 72), max_colors=6,
    ramps=("ui_teal", "accent"), group=G, content="Рамка 4 px вокруг окна 64×64, центр прозрачный.",
    prompt="Square dark-teal portrait frame with a thin amber inner line, transparent centre.")
add("UI-PASSEPARTOUT", "W2-16", U + "ui_passepartout.png", "Паспарту (тайл)", (16, 16), alpha="opaque", max_colors=3,
    ramps=("ui_teal",), group=G, content="Тёмная бирюзовая ткань с пиксельной строчкой, бесшовный тайл.",
    prompt="Seamless 16x16 tile of dark teal fabric with a subtle stitched pixel pattern.")
add("UI-PERF-DOT", "W2-16", U + "ui_perf_dot.png", "Перфорация прогресса", (16, 8), frame=(8, 8), max_colors=4,
    ramps=("paper", "accent"), group=G, layout="1 ряд × 2: пустая, заполненная", prompt="Punched hole: empty and filled amber.")
add("UI-BOOK-SPREAD", "W2-16", U + "ui_book_spread.png", "Справочник: разворот", (400, 240), max_colors=16,
    ramps=("facade", "paper", "ink"), group=G, content="Раскрытая книга в тканевом переплёте, две пустые страницы, корешок по центру.",
    prompt="Open hardcover reference book seen from above, cloth binding, two blank cream pages, centre spine shadow.")
add("UI-BOOK-STRAP", "W2-16", U + "ui_book_strap.png", "Справочник закрыт на ремешок", (200, 240), max_colors=12,
    ramps=("facade", "stone"), group=G, prompt="Closed hardcover book fastened with a leather strap and buckle, front view, no title.")
add("UI-JOURNAL-SPREAD", "W2-16", U + "ui_journal_spread.png", "Журнал допуска: разворот", (400, 240), max_colors=16,
    ramps=("ui_teal", "paper", "ink"), group=G, content="Разлинованный журнал в тёмно-бирюзовой обложке, пустые страницы.",
    prompt="Open ruled logbook with a dark teal cover seen from above, two blank lined pages.")
add("UI-INDEX-TAB", "W2-16", U + "ui_index_tab.png", "Указатель группы в журнале", (96, 16), frame=(32, 16), max_colors=6,
    ramps=("paper", "accent", "ui_teal"), group=G, layout="1 ряд × 3: покой, наведение, выбран",
    prompt="Paper index tab on a logbook edge, three states.")
add("UI-USER-CARD", "W2-16", U + "ui_user_card.png", "Карточка участника", (144, 48), frame=(48, 48), max_colors=8,
    ramps=("paper", "accent", "state"), group=G, layout="1 ряд × 3 (9-slice): покой, выбран, допущен",
    prompt="Small cream name card tile, three states: idle, selected with amber border, admitted with a green stamp corner.")
add("UI-LEVEL-NODE", "W2-16", U + "ui_level_node.png", "Узел карты уровня", (96, 24), frame=(24, 24), max_colors=8,
    ramps=("stone", "accent", "marks"), group=G, layout="1 ряд × 4: закрыт, доступен, пройден, пройден идеально",
    prompt="Round tape-map node, four states: grey locked, amber available, green stamped done, gold stamped perfect.")
add("UI-TORN-TAPE", "W2-16", U + "ui_torn_tape.png", "Оборванная лента (ошибки связи)", (160, 64), max_colors=8,
    ramps=("paper", "ink", "ui_teal"), group=G, prompt="Illustration of a teletype paper tape torn in two, ends curling, on dark background transparent.")
add("UI-CERTIFICATE-PAPER", "W2-16", U + "ui_certificate_paper.png", "Бланк свидетельства", (320, 220), max_colors=14,
    ramps=("paper", "facade", "accent", "ink"), group=G,
    content="Пергаментный лист с орнаментальной рамкой из стилизованных изобар и облаков, пустые поля под текст, место под круглую печать справа внизу.",
    must_not="Без текста, гербов и символики реальных организаций.",
    prompt="Blank parchment certificate sheet with an ornamental border of stylised wavy lines and small clouds, empty "
           "text area, empty circle space at lower right for a seal, no text, no emblems.")
add("UI-ENVELOPE", "W2-16", U + "ui_envelope.png", "Конверт награды", (144, 32), frame=(48, 32), max_colors=8,
    ramps=("paper", "facade", "marks"), group=G, layout="1 ряд × 3: закрыт, клапан открывается, открыт",
    prompt="Small paper envelope with a wax seal, three opening frames.")

ICONS = (
    ("journal", "журнал ошибок: тетрадь с закладкой", "notebook with a bookmark"),
    ("discoveries", "находки: бинокль", "binoculars"),
    ("person", "персонаж: силуэт головы и плеч", "person head and shoulders"),
    ("gear", "настройки: шестерня", "gear"),
    ("sound-on", "звук включён: динамик с волнами", "speaker with waves"),
    ("sound-off", "звук выключен: динамик с косой чертой", "muted speaker"),
    ("moon", "ночь", "crescent moon"), ("sun", "день", "sun"), ("dawn", "рассвет: половина солнца над линией", "half sun on horizon"),
    ("lock", "закрыто: замок", "padlock closed"), ("unlock", "открыто: замок открыт", "padlock open"),
    ("pause", "пауза", "pause bars"), ("book", "справочник: книга", "closed book"),
    ("check", "верно: галочка", "check mark"), ("cross", "неверно: крестик карандашом", "pencil cross"),
    ("arrow-left", "назад", "arrow left"), ("arrow-right", "вперёд", "arrow right"),
    ("star", "звезда результата", "star"), ("clock", "время", "clock"), ("tape", "телеграмма: кусок ленты", "piece of paper tape"),
    ("station", "станция: кружок станции", "small circle with a dot (weather station marker)"),
    ("thermometer", "температура", "thermometer"), ("barometer", "давление: стрелочный барометр", "aneroid barometer dial"),
    ("vane", "ветер: флюгер", "weather vane"), ("cloud", "облачность", "cloud"),
)
for iid, ru, en in ICONS:
    add(f"ICON-{iid.upper()}", "W2-16", U + f"icons/icon_{iid}.png", f"Иконка: {ru}", (16, 16), max_colors=5,
        ramps=("paper", "ui_teal", "accent", "ink", "marks"), group="Иконки 16×16",
        content=f"{ru}. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.",
        prompt=f"Single 16x16 pixel icon: {en}, light cream line art with one shade, readable on dark teal, transparent background.")
for mid, ru, en in (("mentor", "режим «С наставником»: две фигуры у стола", "two figures at a desk"),
                    ("solo", "режим «Самостоятельно»: одна фигура с карандашом", "one figure with a pencil"),
                    ("blitz", "режим «Блиц»: секундомер", "stopwatch")):
    add(f"ICON-MODE-{mid.upper()}", "W2-16", U + f"icons/icon_mode_{mid}_32.png", f"Иконка режима: {ru}", (32, 32), max_colors=8,
        ramps=("paper", "ui_teal", "accent", "people"), people=True, group="Иконки 16×16",
        prompt=f"Single 32x32 pixel icon: {en}, cream and teal with one amber accent, transparent background.")

# ---------------------------------------------------------------- бренд и титул
BR = "assets/source/ui/brand/"
G = "Бренд и титульный экран"
add("BRAND-MARK-26063", "W2-17", BR + "brand_mark_26063.png", "Знак «26063»", (96, 32), max_colors=8,
    ramps=("accent", "ui_teal", "stone"), group=G,
    content="Табличка-шильдик 96×32 с пятью цифрами 2-6-0-6-3, каждая 14×20 px, моноширинный трафаретный рисунок как у инвентарного номера; цифры #F2C75C с тенью #B88626 на тёмной табличке #0C2A33 с 4 заклёпками.",
    must_not="Не генерировать: цифры рисуются вручную по пиксельной сетке (генеративные надписи запрещены правилами проекта). Генератор — только для идеи таблички.",
    prompt="(Reference only) Small dark teal metal inventory plate with four rivets, space for five large stencil digits.")
add("BRAND-EMBLEM-64", "W2-17", BR + "brand_emblem_64.png", "Эмблема станции 64×64", (64, 64), max_colors=12,
    ramps=("ui_teal", "accent", "water", "birch_snow"), group=G,
    content="Круглая эмблема: волна залива, силуэт метеомачты с чашечным анемометром, дуга изобары, лавровая веточка; без текста.",
    prompt="Round station emblem badge: stylised bay wave, a weather mast with a cup anemometer, one curved isobar line, a "
           "small laurel sprig, teal and amber, no text.")
add("BRAND-EMBLEM-32", "W2-17", BR + "brand_emblem_32.png", "Эмблема станции 32×32", (32, 32), max_colors=8,
    ramps=("ui_teal", "accent", "water"), group=G,
    content="Та же эмблема, перерисованная под 32 px (не уменьшенная): только волна, мачта и кольцо.",
    prompt="Simplified 32x32 version of the same round emblem: wave, mast, ring only.", post="Рисовать заново, не уменьшать 64.")
add("TITLE-MID", "W2-17", BR + "title_mid.png", "Титул: кампус за водой (средний план)", (480, 270), max_colors=32,
    ramps=("night", "water", "window", "facade", "stone"), group=G, place="Содержимое y 110–200",
    content="Силуэты трёх зданий кампуса, радарный купол и мачта на дальнем берегу, отражения окон в воде y 160–200.",
    prompt="Middle layer only: small campus buildings with warm windows and a radar dome across calm water at night, "
           "with long window reflections; everything above and below transparent.")
add("TITLE-FG", "W2-17", BR + "title_fg.png", "Титул: набережная (передний план)", (480, 270), max_colors=24,
    ramps=("stone", "birch_snow", "foliage", "window", "night"), group=G, place="Содержимое y 200–270 и левый край",
    content="Гранитный парапет набережной с чугунной решёткой, фонарь справа, берёза слева.",
    prompt="Foreground layer only: granite embankment parapet with a cast-iron railing along the bottom, a lamp post on the "
           "right, a birch on the left edge; everything else transparent.")

# ---------------------------------------------------------------- награды
RW = "assets/source/items/rewards/"
G = "Награды уровня"
for rid, ru, en in (
    ("pencil", "карандаш стажёра: простой графитовый, обгрызенный кончик", "a simple well-used graphite pencil"),
    ("badge-thermo", "значок «Термометр»: эмалевый круглый с термометром", "round enamel pin with a thermometer"),
    ("badge-baro", "значок «Барометр»: эмалевый с циферблатом барометра", "round enamel pin with a barometer dial"),
    ("badge-vane", "значок «Флюгер»: эмалевый с флюгером", "round enamel pin with a weather vane"),
    ("lamp", "лампа дежурного: зелёная настольная", "green-shaded desk lamp"),
    ("token", "жетон «Кодовый пост»: латунный круглый с волной и лентой; номер наносится вручную", "round brass token with a wave and tape motif, blank centre"),
    ("certificate", "свидетельство: свёрнутый пергамент с печатью", "rolled parchment with a wax seal"),
):
    add(f"REW-{rid.upper()}-32", "W2-18", RW + f"reward_{rid}_32.png", f"Награда: {ru}", (32, 32), max_colors=10,
        ramps=("accent", "facade", "paper", "ui_teal", "stone", "marks"), group=G,
        prompt=f"Single 32x32 collectible item icon: {en}, slight 3/4 view, soft highlight, transparent background, no text.")
add("REW-LAMP-DESK-M2", "W2-18", RW + "reward_lamp_desk_m2.png", "Лампа дежурного на столе поста", (16, 24), max_colors=8,
    ramps=("ui_teal", "window", "stone"), group=G, pivot="низ по центру",
    prompt="Small green-shaded desk lamp sprite for a room scene, lit, transparent background.")

# ---------------------------------------------------------------- эффекты
FX = "assets/source/effects/"
G = "Эффекты"
add("FX-STAMP-TOOL", "W2-19", FX + "fx_stamp_tool.png", "Штамп в руке (удар)", (48, 20), frame=(16, 20), max_colors=6,
    ramps=("facade", "stone", "marks"), group=G, layout="1 ряд × 3: замах, удар со сжатием, подъём", fps="~16 кадр/с",
    pivot="низ по центру", prompt="Wooden rubber stamp with a round handle, 3 frames: raised, hitting with squash, lifting.")
add("FX-PENCIL-CIRCLE", "W2-19", FX + "fx_pencil_circle.png", "Обводка красным карандашом", (96, 16), frame=(24, 16),
    max_colors=2, ramps=("marks",), group=G, layout="1 ряд × 4: прорисовка эллипса", fps="16 кадр/с",
    prompt="Hand-drawn red pencil ellipse being drawn in 4 frames (quarter, half, three quarters, closed with overlap).")
add("FX-VALUE-TRAIL", "W2-19", FX + "fx_value_trail.png", "След перелёта значения", (24, 8), frame=(8, 8), max_colors=3,
    ramps=("accent",), group=G, layout="1 ряд × 3", prompt="Tiny amber sparkle in 3 fading frames.")
add("FX-WINDOW-GLOW", "W2-19", FX + "fx_window_glow.png", "Вспышка загорающегося окна", (32, 16), frame=(16, 16),
    max_colors=3, ramps=("window",), group=G, layout="1 ряд × 2", prompt="Small dithered warm halo around a window, 2 frames.")


def palette_block() -> str:
    return "\n".join(f"| {name} | `{hexes}` |" for name, hexes in RAMPS.items())


def render_doc() -> str:
    out: list[str] = []
    w = out.append
    w("# 08. Промпты и требования к изображениям уровня КН-01")
    w("")
    w("**Статус:** принято к изготовлению владельцем проекта. Файл собирается командой `python tools/assets/kn01_image_specs.py` из `tools/assets/kn01_image_specs.py`; правки — только там.")
    w("")
    w(f"Всего изображений: **{len(ASSETS)}**. Машинный реестр для проверки: `assets/source/kn01_level1.image-spec.json`.")
    w("")
    w("## 1. Общие требования к каждому файлу")
    w("")
    w("1. Формат: PNG, 8 бит на канал, RGBA (цвет-тип 6) или RGB для непрозрачных, без чересстрочной развёртки, без цветового профиля.")
    w("2. Размер — **точно** указанный в карточке, в логических пикселях. Никакого масштабирования в файле: увеличение делает игра целым коэффициентом.")
    w("3. Прозрачность: «прозрачный фон» — альфа только 0 или 255, никаких полупрозрачных пикселей; «непрозрачный» — альфа 255 везде.")
    w("4. Цвета — только из мастер-палитры `assets/source/palettes/master_26063_v2.gpl` (для персонажей ещё `people_26063_v1.gpl`). Число цветов не больше указанного.")
    w("5. Листы анимации: ряды = состояния, колонки = кадры слева направо; все кадры одного размера; пустые ячейки полностью прозрачны; точка опоры одинакова во всех кадрах.")
    w("6. Никакого текста, букв и цифр в генерируемых изображениях. Надписи («26063», «ПРИНЯТО» и т. п.) наносятся вручную шрифтами `PixCyrillic` 16 px или `Press Start 2P` 8 px.")
    w("7. Один промпт = один вызов генератора = один файл (`docs/design/sprites/GENERATION_SERIES_CONTRACT.md`). Черновики сохранять как `<имя>__candidate-NN.png` рядом с итоговым путём.")
    w("8. Животные, персонажи, одежда и все листы анимации — только черновик генератора; кадры доводятся вручную (`docs/design/sprites/GENERATION_AND_ARTWORK_RULES.md`, §2–5).")
    w("")
    w("## 2. Как сделать файл из результата генератора")
    w("")
    w("Генераторы не умеют выдавать точные 480×270 и чистую палитру. Порядок:")
    w("")
    w("1. Генерировать в кратном размере (рекомендуется ×8: для 480×270 — 3840×2160; для кадра 16×16 — 128×128 на ячейку) на ровном фоне **#FF00FF** (для прозрачных ассетов) — этот цвет не входит в палитру и вырезается.")
    w("2. Выполнить нормализацию — она уменьшит изображение блочным большинством, вырежет фон, приведёт цвета к палитре и запишет файл по нужному пути:")
    w("")
    w("```bash")
    w("python tools/assets/normalize_candidate.py путь/к/сырому.png HUB-L6-GROUND")
    w("```")
    w("")
    w("3. Доработать в Aseprite: одиночные пиксели, контуры, точки опоры кадров.")
    w("4. Проверить:")
    w("")
    w("```bash")
    w("python tools/validate_pixel_art.py")
    w("```")
    w("")
    w("Валидатор показывает по каждому ассету: «ожидается» (файла нет), «ок» или конкретные ошибки (размер, альфа, число цветов, цвет вне палитры, сетка кадров).")
    w("")
    w("### 2.1. Общий фрагмент промпта (добавлять в начало каждого промпта)")
    w("")
    w("```text")
    w(STYLE_LOCK)
    w("```")
    w("")
    w("Негативный промпт для всех:")
    w("")
    w("```text")
    w(NEG_COMMON)
    w("```")
    w("")
    w("### 2.2. Палитра по рампам")
    w("")
    w("| Рампа | Цвета |")
    w("|---|---|")
    w(palette_block())
    w("")
    w("Рампа `people` (кожа и волосы) отсутствовала в утверждённой палитре v2 и **предлагается** в `assets/source/palettes/people_26063_v1.gpl`; её утверждает `art-director` в рамках W1-06. Аватар рисуется тоном кожи `skin_1` и волосами `hair_dark`; остальные тона подставляет код.")
    w("")
    w("### 2.3. Раскладка хаба (480×270), чтобы слои совпали")
    w("")
    w("```text")
    w("y 0–96    небо (L0), облака (L1, y 20–80)")
    w("y 74–104  горизонт: город и залив (L2)")
    w("y 100–124 вода у набережной (L3)")
    w("y 118–126 гранитная набережная (L6)")
    w("y 126–152 верхняя терраса; основания зданий заднего ряда на y=152:")
    w("          радар x=52, картография x=136, архив x=344, аэрология x=432")
    w("y 152–204 нижняя терраса; оперативный зал: основание x=240, y=200; турнирный зал x=392, y=204")
    w("y 196–236 метеоплощадка x 24–140 (будка, мачта анемометра, ветроуказатель)")
    w("y 230–270 площадь с фонарями и клумбой")
    w("x 0–72 / 408–480 — берёза и сосна переднего плана (L9)")
    w("```")
    w("")
    w("## 3. Карточки изображений")
    w("")
    group = None
    for a in ASSETS:
        if a["group"] != group:
            group = a["group"]
            w(f"### {group}")
            w("")
        size = f"{a['size'][0]}×{a['size'][1]}"
        frame = f"; кадр {a['frame'][0]}×{a['frame'][1]}" if a["frame"] else ""
        alpha = "непрозрачный" if a["alpha"] == "opaque" else "прозрачный (альфа 0/255)"
        w(f"#### `{a['id']}` — {a['title']}")
        w("")
        w(f"- **Файл:** `{a['path']}` · **задача:** {a['task']}")
        w(f"- **Размер:** {size}{frame} · **фон:** {alpha} · **цветов не больше:** {a['max_colors']}")
        if a["ramps"]:
            w(f"- **Рампы:** {', '.join(a['ramps'])}")
        for label, key in (("Раскладка листа", "layout"), ("Частота", "fps"), ("Точка опоры", "pivot"),
                           ("Место в сцене", "place"), ("Содержание", "content"), ("Нельзя", "must_not"),
                           ("После генерации", "post")):
            if a[key]:
                w(f"- **{label}:** {a[key]}")
        w("")
        w("```text")
        w(a["prompt"])
        w("```")
        w("")
    return "\n".join(out) + "\n"


def render_spec() -> dict:
    return {
        "version": 1,
        "generated_by": "tools/assets/kn01_image_specs.py",
        "palettes": {"master": MASTER_PALETTE, "people": PEOPLE_PALETTE},
        "chroma_key": "#FF00FF",
        "assets": [
            {
                k: a[k]
                for k in (
                    "id", "task", "title", "path", "size", "frame", "alpha",
                    "max_colors", "people", "prompt", "content", "ramps"
                )
                if k in a and a[k] is not None
            }
            for a in ASSETS
        ],
    }


def render_people_gpl() -> str:
    lines = ["GIMP Palette", "Name: 26063 people v1 (proposal, needs art-director approval)", "Columns: 4", "#"]
    for name, hexv in PEOPLE_GPL:
        r, g, b = (int(hexv[i:i + 2], 16) for i in (1, 3, 5))
        lines.append(f"{r:3d} {g:3d} {b:3d}\t{name}")
    return "\n".join(lines) + "\n"


def main() -> None:
    ids = [a["id"] for a in ASSETS]
    dupes = {i for i in ids if ids.count(i) > 1}
    paths = [a["path"] for a in ASSETS]
    if dupes or len(set(paths)) != len(paths):
        raise SystemExit(f"повторяющиеся идентификаторы или пути: {dupes}")
    for a in ASSETS:
        if a["frame"] and (a["size"][0] % a["frame"][0] or a["size"][1] % a["frame"][1]):
            raise SystemExit(f"{a['id']}: размер не кратен кадру")
    DOC.write_text(render_doc(), encoding="utf-8")
    SPEC.write_text(json.dumps(render_spec(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / PEOPLE_PALETTE).write_text(render_people_gpl(), encoding="utf-8")
    print(f"Записано: {len(ASSETS)} изображений → {DOC.relative_to(ROOT)}, {SPEC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
