#!/usr/bin/env python3
"""Deterministic UI slicing script for "26063: Позывной «Синоптик»".

Slices user-provided pixel-art sheets into:
- 24 system & gameplay icons (with 128x128 uniform canvas, 64x64, 32x32 scales, and raw unscaled crops);
- 30 key UI frames, panels, progress bars, buttons, and decorative elements (+ 1 mirrored corner);
- Clean binary alpha (alpha in {0, 255}), eliminating compression/export halo;
- Outputs to assets/source/ui/ and apps/web/public/ui/;
- Generates JSON manifests assets/manifests/ui.icons.v2.json and assets/manifests/ui.frames.v2.json;
- Validates all output PNG files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

from PIL import Image
import numpy as np
import scipy.ndimage as ndimage

ROOT = Path(__file__).resolve().parents[3]

DEFAULT_SHEET1 = Path(
    "/Users/meteo/.gemini/antigravity2/brain/5f5485c8-acdb-415b-ad71-a6ffe1808f71/.user_uploaded/media_1793036522394_004df1f7.png"
)
DEFAULT_SHEET2 = Path(
    "/Users/meteo/.gemini/antigravity2/brain/5f5485c8-acdb-415b-ad71-a6ffe1808f71/.user_uploaded/media_1793036645834_adcd63f0.png"
)

# Icon metadata definitions in row-major order (4 rows x 6 columns)
ICON_METADATA: list[dict[str, Any]] = [
    # Row 0
    {
        "id": "icon.profile.student",
        "file_stem": "icon_profile_student",
        "name": "Слушатель курсов синоптиков",
        "category": "profile",
        "palette": ["ui.navy", "ui.blue", "ui.gold", "ui.skin"],
        "description": "Портрет слушателя гидрометкласса в форменном синем кителе и галстуке",
    },
    {
        "id": "icon.profile.observer",
        "file_stem": "icon_profile_observer",
        "name": "Дежурный наблюдатель станции",
        "category": "profile",
        "palette": ["ui.navy", "ui.steel", "ui.gold", "ui.skin"],
        "description": "Портрет штатного метеонаблюдателя в фуражке с кокардой и погонами",
    },
    {
        "id": "icon.doc.kn01.code",
        "file_stem": "icon_doc_kn01_code",
        "name": "Синоптическая телеграмма КН-01",
        "category": "data",
        "palette": ["ui.paper", "ui.amber", "ui.blue", "ui.dark"],
        "description": "Бланк шифровки КН-01 с кодовыми группами и станцией на кольцевой диаграмме",
    },
    {
        "id": "icon.trophy.gold",
        "file_stem": "icon_trophy_gold",
        "name": "Золотой кубок победителя",
        "category": "reward",
        "palette": ["ui.gold", "ui.amber", "ui.white", "ui.dark"],
        "description": "Наградной кубок за победу в турнире прогнозистов с сияющим бликом",
    },
    {
        "id": "icon.settings.system",
        "file_stem": "icon_settings_system",
        "name": "Системные настройки",
        "category": "system",
        "palette": ["ui.steel", "ui.navy", "ui.dark"],
        "description": "Стальная шестерня параметров терминала и калибровки приборов",
    },
    {
        "id": "icon.sys.logout",
        "file_stem": "icon_sys_logout",
        "name": "Выход со станции",
        "category": "system",
        "palette": ["ui.navy", "ui.white", "ui.dark"],
        "description": "Символ шлюза и выхода из рабочей смены станции 26063",
    },
    # Row 1
    {
        "id": "icon.map.cartography",
        "file_stem": "icon_map_cartography",
        "name": "Синоптическая карта",
        "category": "navigation",
        "palette": ["ui.cyan", "ui.green", "ui.gold", "ui.navy"],
        "description": "Сложенный лист приземной карты погоды с геометкой станции",
    },
    {
        "id": "icon.weather.variable",
        "file_stem": "icon_weather_variable",
        "name": "Переменная облачность",
        "category": "weather",
        "palette": ["ui.gold", "ui.cloud_white", "ui.sky", "ui.dark"],
        "description": "Яркое солнце за кучевым облаком — переменная облачность",
    },
    {
        "id": "icon.analytics.trend",
        "file_stem": "icon_analytics_trend",
        "name": "Барическая тенденция",
        "category": "analytics",
        "palette": ["ui.amber", "ui.red", "ui.navy", "ui.steel"],
        "description": "График изменения метеовеличин с восходящей барической стрелкой",
    },
    {
        "id": "icon.library.manuals",
        "file_stem": "icon_library_manuals",
        "name": "Наставления гидрометеослужбы",
        "category": "archive",
        "palette": ["ui.red", "ui.emerald", "ui.blue", "ui.gold"],
        "description": "Стопка учебных томов синоптической метеорологии и атласов облаков",
    },
    {
        "id": "icon.roster.team",
        "file_stem": "icon_roster_team",
        "name": "Смена синоптиков",
        "category": "social",
        "palette": ["ui.gold", "ui.blue", "ui.magenta", "ui.dark"],
        "description": "Силуэты дежурной смены специалистов центра",
    },
    {
        "id": "icon.trophy.star",
        "file_stem": "icon_trophy_star",
        "name": "Рейтинговый кубок со звездой",
        "category": "reward",
        "palette": ["ui.gold", "ui.amber", "ui.star_glow", "ui.dark"],
        "description": "Кубок рангового сезона с гравированной звездой мастерства",
    },
    # Row 2
    {
        "id": "icon.telegram.dispatch",
        "file_stem": "icon_telegram_dispatch",
        "name": "Телеграмма-сводка",
        "category": "communication",
        "palette": ["ui.white", "ui.amber", "ui.navy", "ui.dark"],
        "description": "Вскрытый почтовый пакет со срочной штормовой сводкой",
    },
    {
        "id": "icon.schedule.calendar",
        "file_stem": "icon_schedule_calendar",
        "name": "График наблюдений",
        "category": "schedule",
        "palette": ["ui.white", "ui.red", "ui.navy", "ui.dark"],
        "description": "Настенный табель стандартных сроков метеонаблюдений (00, 03, 06... ВСВ)",
    },
    {
        "id": "icon.alert.bell",
        "file_stem": "icon_alert_bell",
        "name": "Штормовое оповещение",
        "category": "alert",
        "palette": ["ui.gold", "ui.amber", "ui.dark"],
        "description": "Сигнальный колокол штормовой опасности и неблагоприятных явлений",
    },
    {
        "id": "icon.guide.help",
        "file_stem": "icon_guide_help",
        "name": "Справочник и консультации",
        "category": "help",
        "palette": ["ui.cyan", "ui.sky", "ui.navy", "ui.dark"],
        "description": "Объёмный символ справочника синоптика и методических указаний",
    },
    {
        "id": "icon.radar.dish",
        "file_stem": "icon_radar_dish",
        "name": "Метеорологический радиолокатор",
        "category": "equipment",
        "palette": ["ui.steel", "ui.navy", "ui.amber", "ui.dark"],
        "description": "Параболическая антенна доплеровского метеолокатора МРЛ с излучением",
    },
    {
        "id": "icon.archive.drawer",
        "file_stem": "icon_archive_drawer",
        "name": "Картотека наблюдений",
        "category": "archive",
        "palette": ["ui.amber", "ui.gold", "ui.navy", "ui.white"],
        "description": "Архивный выдвижной ящик с перфокартами и бюллетенями погоды",
    },
    # Row 3
    {
        "id": "icon.synoptic.chart.tile",
        "file_stem": "icon_synoptic_chart_tile",
        "name": "Синоптический планшет",
        "category": "navigation",
        "palette": ["ui.cyan", "ui.teal", "ui.gold", "ui.cloud_white"],
        "description": "Квадратный планшет синоптика с изобарами, фронтами и облачностью",
    },
    {
        "id": "icon.rank.promote.up",
        "file_stem": "icon_rank_promote_up",
        "name": "Повышение разряда",
        "category": "progression",
        "palette": ["ui.emerald", "ui.mint", "ui.white", "ui.dark"],
        "description": "Клавиша повышения разряда и квалификационного уровня синоптика",
    },
    {
        "id": "icon.gear.default",
        "file_stem": "icon_gear_default",
        "name": "Шестерня механизма (сталь)",
        "category": "system",
        "palette": ["ui.steel", "ui.silver", "ui.navy", "ui.dark"],
        "description": "Механический узел прибора в стандартном стальном исполнении",
    },
    {
        "id": "icon.gear.active",
        "file_stem": "icon_gear_active",
        "name": "Шестерня механизма (активная)",
        "category": "system",
        "palette": ["ui.cyan", "ui.sky", "ui.navy", "ui.dark"],
        "description": "Механический узел в активном состоянии с неоновой лазурной подсветкой",
    },
    {
        "id": "icon.gear.dark",
        "file_stem": "icon_gear_dark",
        "name": "Шестерня механизма (индиго)",
        "category": "system",
        "palette": ["ui.navy", "ui.indigo", "ui.dark"],
        "description": "Механический узел в нажатом/активном состоянии цвета глубокого индиго",
    },
    {
        "id": "icon.gear.disabled",
        "file_stem": "icon_gear_disabled",
        "name": "Шестерня механизма (неактивная)",
        "category": "system",
        "palette": ["ui.charcoal", "ui.gray", "ui.dark"],
        "description": "Механический узел в отключенном или заблокированном состоянии",
    },
]

# Frame definitions from Sheet 1
FRAME_DEFINITIONS: list[dict[str, Any]] = [
    # Row 0
    {
        "id": "frame.header.banner.wide",
        "file_name": "panel_header_banner_wide.png",
        "name": "Главная панель заголовка / баннер",
        "category": "panel",
        "crop_box": (37, 36, 852, 139),
        "description": "Широкий верхний баннер с декоративными скошенными углами и двойным кантом",
    },
    {
        "id": "frame.square.dialog",
        "file_name": "panel_square_dialog.png",
        "name": "Квадратная модальная панель",
        "category": "panel",
        "crop_box": (867, 33, 988, 146),
        "description": "Крупный квадратный контейнер диалога/аватара со скошенными углами",
    },
    # Row 1
    {
        "id": "frame.input.console",
        "file_name": "frame_input_console.png",
        "name": "Поле консольного ввода",
        "category": "input",
        "crop_box": (37, 165, 462, 225),
        "description": "Горизонтальная рамка текстового ввода позывного или поисковой строки",
    },
    {
        "id": "frame.progress.bar.teal",
        "file_name": "progress_bar_teal_frame.png",
        "name": "Шкала прогресса (бирюзовая)",
        "category": "progress",
        "crop_box": (479, 181, 868, 210),
        "description": "Горизонтальный индикатор прогресса со шкалой бирюзового свечения",
    },
    {
        "id": "frame.card.badge.sm",
        "file_name": "frame_card_badge_sm.png",
        "name": "Малая карточка ордена / награды",
        "category": "card",
        "crop_box": (887, 158, 990, 236),
        "description": "Компактная прямоугольная плашка для отображения медали или знака",
    },
    # Row 2 (5 Medium Cards)
    {
        "id": "frame.card.medium.default",
        "file_name": "card_panel_medium_default.png",
        "name": "Средняя карточка (базовая сталь)",
        "category": "card",
        "crop_box": (38, 243, 199, 386),
        "description": "Информационная карточка со стандартным стальным кантом",
    },
    {
        "id": "frame.card.medium.active",
        "file_name": "card_panel_medium_active.png",
        "name": "Средняя карточка (лазурная подсветка)",
        "category": "card",
        "crop_box": (219, 243, 381, 386),
        "description": "Информационная карточка в активном состоянии с лазурным неоновым кантом",
    },
    {
        "id": "frame.card.medium.focused",
        "file_name": "card_panel_medium_focused.png",
        "name": "Средняя карточка (глубокий индиго)",
        "category": "card",
        "crop_box": (402, 243, 563, 386),
        "description": "Информационная карточка в состоянии фокуса тёмного индиго",
    },
    {
        "id": "frame.card.medium.success",
        "file_name": "card_panel_medium_success.png",
        "name": "Средняя карточка (зелёное подтверждение)",
        "category": "card",
        "crop_box": (580, 243, 743, 386),
        "description": "Информационная карточка с зелёной рамкой верифицированного прогноза",
    },
    {
        "id": "frame.card.medium.disabled",
        "file_name": "card_panel_medium_disabled.png",
        "name": "Средняя карточка (серая блокировка)",
        "category": "card",
        "crop_box": (760, 243, 923, 386),
        "description": "Информационная карточка в заблокированном сером состоянии",
    },
    # Row 3 (5 Icon Slots + 3 Compact Buttons)
    {
        "id": "frame.slot.default",
        "file_name": "slot_frame_default.png",
        "name": "Слот инвентаря (базовый)",
        "category": "slot",
        "crop_box": (37, 410, 136, 507),
        "description": "Квадратный слот экипировки/значков со стальной рамкой",
    },
    {
        "id": "frame.slot.active",
        "file_name": "slot_frame_active.png",
        "name": "Слот инвентаря (активный лазурный)",
        "category": "slot",
        "crop_box": (149, 410, 249, 507),
        "description": "Квадратный слот экипировки с лазурной подсветкой",
    },
    {
        "id": "frame.slot.focused",
        "file_name": "slot_frame_focused.png",
        "name": "Слот инвентаря (фокус индиго)",
        "category": "slot",
        "crop_box": (262, 410, 362, 507),
        "description": "Квадратный слот экипировки в тёмном тоне индиго",
    },
    {
        "id": "frame.slot.success",
        "file_name": "slot_frame_success.png",
        "name": "Слот инвентаря (зелёный успех)",
        "category": "slot",
        "crop_box": (375, 410, 478, 507),
        "description": "Квадратный слот экипировки с зелёной каймой успеха",
    },
    {
        "id": "frame.slot.disabled",
        "file_name": "slot_frame_disabled.png",
        "name": "Слот инвентаря (серый заблокирован)",
        "category": "slot",
        "crop_box": (490, 410, 592, 507),
        "description": "Квадратный слот экипировки в заблокированном сером тоне",
    },
    {
        "id": "frame.btn.square.compact.green",
        "file_name": "btn_square_compact_green.png",
        "name": "Компактная кнопка (зелёная)",
        "category": "button",
        "crop_box": (689, 417, 774, 499),
        "description": "Компактная квадратная клавиша с зелёным кантом готовности",
    },
    {
        "id": "frame.btn.square.compact.amber",
        "file_name": "btn_square_compact_amber.png",
        "name": "Компактная кнопка (янтарная)",
        "category": "button",
        "crop_box": (788, 417, 872, 500),
        "description": "Компактная квадратная клавиша с янтарным кантом предупреждения",
    },
    {
        "id": "frame.btn.square.compact.blue",
        "file_name": "btn_square_compact_blue.png",
        "name": "Компактная кнопка (синяя)",
        "category": "button",
        "crop_box": (887, 417, 971, 499),
        "description": "Компактная квадратная клавиша с синим кантом выбора",
    },
    # Row 4 (3 Item Bars with Right Sub-Slots)
    {
        "id": "frame.panel.item.bar.sm",
        "file_name": "panel_item_bar_subslot_sm.png",
        "name": "Панель предмета со слотом 234px",
        "category": "panel",
        "crop_box": (29, 523, 263, 615),
        "description": "Горизонтальная панель предмета с правым квадратным суб-слотом (малая)",
    },
    {
        "id": "frame.panel.item.bar.md",
        "file_name": "panel_item_bar_subslot_md.png",
        "name": "Панель предмета со слотом 303px",
        "category": "panel",
        "crop_box": (279, 523, 582, 615),
        "description": "Горизонтальная панель предмета с правым квадратным суб-слотом (средняя)",
    },
    {
        "id": "frame.panel.item.bar.lg",
        "file_name": "panel_item_bar_subslot_lg.png",
        "name": "Панель предмета со слотом 402px",
        "category": "panel",
        "crop_box": (594, 523, 996, 615),
        "description": "Горизонтальная панель предмета с правым квадратным суб-слотом (широкая)",
    },
    # Row 5 (3 Pill Buttons + 6 Decorative Accents)
    {
        "id": "frame.btn.pill.primary.cyan",
        "file_name": "btn_pill_primary_cyan.png",
        "name": "Кнопка действия первичная (лазурная)",
        "category": "button",
        "crop_box": (29, 640, 355, 733),
        "description": "Главная клавиша действия с лазурным неоновым кантом 326px",
    },
    {
        "id": "frame.btn.pill.secondary.steel",
        "file_name": "btn_pill_secondary_steel.png",
        "name": "Кнопка действия вторичная (стальная)",
        "category": "button",
        "crop_box": (371, 645, 615, 728),
        "description": "Вторичная клавиша действия со стальным кантом 244px",
    },
    {
        "id": "frame.btn.pill.alert.badge",
        "file_name": "btn_pill_alert_badge.png",
        "name": "Кнопка с индикатором тревоги",
        "category": "button",
        "crop_box": (633, 650, 845, 723),
        "description": "Клавиша действия с круглым красным индикатором оповещения/шторма",
    },
    {
        "id": "frame.decor.corner.tl",
        "file_name": "decor_corner_bracket_tl.png",
        "name": "Угловой кронштейн рамки (верхний левый)",
        "category": "decor",
        "crop_box": (867, 643, 902, 678),
        "description": "Декоративный угловой научный кронштейн интерфейса станции (TL)",
    },
    {
        "id": "frame.decor.corner.tr",
        "file_name": "decor_corner_bracket_tr.png",
        "name": "Угловой кронштейн рамки (верхний правый)",
        "category": "decor",
        "crop_box": (963, 643, 997, 678),
        "description": "Декоративный угловой научный кронштейн интерфейса станции (TR)",
    },
    {
        "id": "frame.decor.corner.bl",
        "file_name": "decor_corner_bracket_bl.png",
        "name": "Угловой кронштейн рамки (нижний левый)",
        "category": "decor",
        "crop_box": (867, 691, 895, 725),
        "description": "Декоративный угловой научный кронштейн интерфейса станции (BL)",
    },
    {
        "id": "frame.decor.corner.br",
        "file_name": "decor_corner_bracket_br.png",
        "name": "Угловой кронштейн рамки (нижний правый)",
        "category": "decor",
        "mirror_from": "decor_corner_bracket_bl.png",
        "description": "Декоративный угловой научный кронштейн интерфейса станции (BR, зеркальный)",
    },
    {
        "id": "frame.decor.accent.diamond",
        "file_name": "decor_accent_diamond.png",
        "name": "Ромбовидный прицел / акцент",
        "category": "decor",
        "crop_box": (916, 655, 946, 684),
        "description": "Ромбовидный маркер интерфейса с золотой сердцевиной",
    },
    {
        "id": "frame.decor.divider.bar",
        "file_name": "decor_divider_bar.png",
        "name": "Капсульный разделитель",
        "category": "decor",
        "crop_box": (906, 708, 957, 720),
        "description": "Горизонтальная стальная плашка-разделитель блоков интерфейса",
    },
    {
        "id": "frame.decor.indicator.pip",
        "file_name": "decor_indicator_pip.png",
        "name": "Точечный индикатор / заклепка",
        "category": "decor",
        "crop_box": (969, 700, 992, 724),
        "description": "Круглый индикаторный датчик / заклёпка с золотым ядром",
    },
]


def clean_binary_alpha(arr: np.ndarray, threshold: int = 128) -> np.ndarray:
    """Sets alpha strictly to 0 or 255. Pixels with alpha < threshold are zeroed."""
    cleaned = arr.copy()
    mask = cleaned[:, :, 3] >= threshold
    cleaned[~mask] = [0, 0, 0, 0]
    cleaned[mask, 3] = 255
    return cleaned


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def validate_png_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing expected output: {path}")
    raw_size = path.stat().st_size
    if raw_size == 0:
        raise ValueError(f"Empty output file: {path}")

    with Image.open(path) as im:
        w, h = im.size
        mode = im.mode
        arr = np.array(im)

    unique_alphas = sorted(set(np.unique(arr[:, :, 3]))) if mode == "RGBA" else [255]
    if not set(unique_alphas).issubset({0, 255}):
        raise ValueError(f"Fractional alpha detected in {path.name}: {unique_alphas}")

    opaque_pixels = int(np.sum(arr[:, :, 3] == 255)) if mode == "RGBA" else (w * h)
    if opaque_pixels == 0:
        raise ValueError(f"Completely transparent image: {path.name}")

    return {
        "file": path.name,
        "width": w,
        "height": h,
        "mode": mode,
        "bytes": raw_size,
        "alphas": unique_alphas,
        "opaque_pixels": opaque_pixels,
        "sha256": compute_sha256(path),
    }


def slice_icons(
    sheet2_path: Path,
    source_dir: Path,
    runtime_dir: Path,
) -> list[dict[str, Any]]:
    """Slices 24 icons from Sheet 2, generates uniform 128x128, 64x64, 32x32, and raw versions."""
    print(f"Loading Sheet 2: {sheet2_path}")
    im = Image.open(sheet2_path)
    arr = np.array(im)
    cleaned = clean_binary_alpha(arr, threshold=128)

    # Detect 24 components
    mask = cleaned[:, :, 3] == 255
    lbl, n = ndimage.label(mask)
    objs = ndimage.find_objects(lbl)
    objs = [s for s in objs if (s[0].stop - s[0].start) >= 30 and (s[1].stop - s[1].start) >= 30]

    if len(objs) != 24:
        raise RuntimeError(f"Expected 24 icons from Sheet 2, found {len(objs)}")

    # Sort into 4 rows of 6
    rows: list[list[tuple[int, int, int, int]]] = [[], [], [], []]
    for sl in objs:
        ymin, ymax = sl[0].start, sl[0].stop
        xmin, xmax = sl[1].start, sl[1].stop
        yc = (ymin + ymax) / 2
        r = 0 if yc < 320 else (1 if yc < 530 else (2 if yc < 740 else 3))
        rows[r].append((xmin, ymin, xmax, ymax))

    for r in range(4):
        rows[r].sort(key=lambda b: b[0])

    manifest_items: list[dict[str, Any]] = []

    icon_idx = 0
    for r in range(4):
        for c in range(6):
            box = rows[r][c]
            meta = ICON_METADATA[icon_idx]
            stem = meta["file_stem"]

            # Crop raw icon from cleaned sheet
            raw_crop = cleaned[box[1] : box[3], box[0] : box[2]].copy()
            raw_im = Image.fromarray(raw_crop)
            raw_w, raw_h = raw_im.size

            # Base uniform canvas: center on 192x192 square canvas
            canvas_192 = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
            canvas_192.paste(raw_im, ((192 - raw_w) // 2, (192 - raw_h) // 2))

            # 128x128 uniform scale (scale factor 2/3)
            im_128 = canvas_192.resize((128, 128), Image.Resampling.NEAREST)
            # 64x64 scale (scale factor 1/3)
            im_64 = canvas_192.resize((64, 64), Image.Resampling.NEAREST)
            # 32x32 scale (scale factor 1/6)
            im_32 = canvas_192.resize((32, 32), Image.Resampling.NEAREST)

            # Paths
            p_raw = source_dir / f"{stem}_raw.png"
            p_128_src = source_dir / f"{stem}.png"
            p_128_src_alt = source_dir / f"{stem}_128.png"
            p_64_src = source_dir / f"{stem}_64.png"
            p_32_src = source_dir / f"{stem}_32.png"

            # Save source
            raw_im.save(p_raw)
            im_128.save(p_128_src)
            im_128.save(p_128_src_alt)
            im_64.save(p_64_src)
            im_32.save(p_32_src)

            # Copy to runtime
            p_128_rt = runtime_dir / f"{stem}.png"
            p_128_rt_alt = runtime_dir / f"{stem}_128.png"
            p_64_rt = runtime_dir / f"{stem}_64.png"
            p_32_rt = runtime_dir / f"{stem}_32.png"

            shutil.copy2(p_128_src, p_128_rt)
            shutil.copy2(p_128_src_alt, p_128_rt_alt)
            shutil.copy2(p_64_src, p_64_rt)
            shutil.copy2(p_32_src, p_32_rt)

            # Validate outputs
            v_128 = validate_png_file(p_128_src)
            v_64 = validate_png_file(p_64_src)
            v_32 = validate_png_file(p_32_src)
            v_raw = validate_png_file(p_raw)

            manifest_items.append(
                {
                    "id": meta["id"],
                    "file": f"{stem}.png",
                    "name": meta["name"],
                    "category": meta["category"],
                    "palette": meta["palette"],
                    "description": meta["description"],
                    "gridRow": r,
                    "gridCol": c,
                    "sourceBoundingBox": {"x": box[0], "y": box[1], "width": raw_w, "height": raw_h},
                    "uniformCanvas": {"width": 128, "height": 128},
                    "variants": {
                        "default": {
                            "file": f"{stem}.png",
                            "publicPath": f"/ui/icons/{stem}.png",
                            "size": [128, 128],
                            "sha256": v_128["sha256"],
                        },
                        "128": {
                            "file": f"{stem}_128.png",
                            "publicPath": f"/ui/icons/{stem}_128.png",
                            "size": [128, 128],
                            "sha256": v_128["sha256"],
                        },
                        "64": {
                            "file": f"{stem}_64.png",
                            "publicPath": f"/ui/icons/{stem}_64.png",
                            "size": [64, 64],
                            "sha256": v_64["sha256"],
                        },
                        "32": {
                            "file": f"{stem}_32.png",
                            "publicPath": f"/ui/icons/{stem}_32.png",
                            "size": [32, 32],
                            "sha256": v_32["sha256"],
                        },
                        "raw": {
                            "file": f"{stem}_raw.png",
                            "sourcePath": f"assets/source/ui/icons/{stem}_raw.png",
                            "size": [raw_w, raw_h],
                            "sha256": v_raw["sha256"],
                        },
                    },
                }
            )

            icon_idx += 1

    return manifest_items


def slice_frames(
    sheet1_path: Path,
    source_dir: Path,
    runtime_dir: Path,
) -> list[dict[str, Any]]:
    """Slices all 30 frames, panels, buttons, and accents from Sheet 1, plus 1 mirrored corner."""
    print(f"Loading Sheet 1: {sheet1_path}")
    im = Image.open(sheet1_path)
    arr = np.array(im)
    cleaned = clean_binary_alpha(arr, threshold=128)

    manifest_items: list[dict[str, Any]] = []

    for defn in FRAME_DEFINITIONS:
        file_name = defn["file_name"]
        src_path = source_dir / file_name
        rt_path = runtime_dir / file_name

        if "mirror_from" in defn:
            mirror_source = source_dir / defn["mirror_from"]
            if not mirror_source.exists():
                raise FileNotFoundError(f"Missing mirror source: {mirror_source}")
            base_img = Image.open(mirror_source)
            # Mirror horizontally to get bottom-right from bottom-left
            mirrored = base_img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            mirrored.save(src_path)
        else:
            box = defn["crop_box"]
            crop_arr = cleaned[box[1] : box[3], box[0] : box[2]].copy()
            # Double check tight bounds of the crop
            crop_mask = crop_arr[:, :, 3] == 255
            py, px = np.where(crop_mask)
            if len(py) == 0:
                raise ValueError(f"Crop {file_name} has no opaque pixels in {box}")
            tight_crop = crop_arr[py.min() : py.max() + 1, px.min() : px.max() + 1]
            crop_img = Image.fromarray(tight_crop)
            crop_img.save(src_path)

        # Copy to runtime
        shutil.copy2(src_path, rt_path)

        # Validate
        v = validate_png_file(src_path)
        validate_png_file(rt_path)

        manifest_items.append(
            {
                "id": defn["id"],
                "file": file_name,
                "name": defn["name"],
                "category": defn["category"],
                "publicPath": f"/ui/frames/{file_name}",
                "sourcePath": f"assets/source/ui/frames/{file_name}",
                "logicalSize": {"width": v["width"], "height": v["height"]},
                "bytes": v["bytes"],
                "sha256": v["sha256"],
                "description": defn["description"],
            }
        )

    return manifest_items


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic UI slicing for 26063")
    parser.add_argument("--sheet1", type=Path, default=DEFAULT_SHEET1, help="Sheet 1 (Frames & Controls)")
    parser.add_argument("--sheet2", type=Path, default=DEFAULT_SHEET2, help="Sheet 2 (24 Icons)")
    args = parser.parse_args()

    sheet1_path = args.sheet1
    sheet2_path = args.sheet2

    if not sheet1_path.exists():
        print(f"Error: Sheet 1 not found: {sheet1_path}", file=sys.stderr)
        return 1
    if not sheet2_path.exists():
        print(f"Error: Sheet 2 not found: {sheet2_path}", file=sys.stderr)
        return 1

    # Output directories
    icons_src = ROOT / "assets/source/ui/icons"
    icons_rt = ROOT / "apps/web/public/ui/icons"
    frames_src = ROOT / "assets/source/ui/frames"
    frames_rt = ROOT / "apps/web/public/ui/frames"
    manifests_dir = ROOT / "assets/manifests"

    for d in [icons_src, icons_rt, frames_src, frames_rt, manifests_dir]:
        d.mkdir(parents=True, exist_ok=True)

    print("=== 1. Slicing 24 System & Gameplay Icons (Sheet 2) ===")
    icon_items = slice_icons(sheet2_path, icons_src, icons_rt)
    print(f"Successfully generated and validated {len(icon_items)} icons across all scale variants.")

    print("\n=== 2. Slicing UI Frames, Panels, Buttons & Accents (Sheet 1) ===")
    frame_items = slice_frames(sheet1_path, frames_src, frames_rt)
    print(f"Successfully generated and validated {len(frame_items)} UI frames and controls.")

    print("\n=== 3. Writing Manifests ===")
    sheet1_sha256 = compute_sha256(sheet1_path)
    sheet2_sha256 = compute_sha256(sheet2_path)

    icons_manifest = {
        "$schema": "https://synopsis-game.local/schemas/asset-manifest.schema.json",
        "id": "ui.icons.v2",
        "schema": "asset-manifest/v2",
        "kind": "ui",
        "layer": "ui",
        "title": "26063: Позывной «Синоптик» — Пакет системных и игровых пиктограмм v2",
        "sourceSheet": {
            "path": str(sheet2_path),
            "size": [1024, 1024],
            "sha256": sheet2_sha256,
        },
        "publicBase": "/ui/icons/",
        "count": len(icon_items),
        "supportedScales": [128, 64, 32, "raw"],
        "provenance": {
            "origin": "26063: Позывной «Синоптик» — UI Icons Batch v2",
            "author": "pixel-asset-pipeline-engineer",
            "license": "project-internal-production",
            "policy": "Nearest-neighbor clean pixel art, strictly binary alpha (0 or 255)",
        },
        "items": icon_items,
    }

    frames_manifest = {
        "$schema": "https://synopsis-game.local/schemas/asset-manifest.schema.json",
        "id": "ui.frames.v2",
        "schema": "asset-manifest/v2",
        "kind": "ui",
        "layer": "ui",
        "title": "26063: Позывной «Синоптик» — Пакет экранных рамок, панелей и контролов v2",
        "sourceSheet": {
            "path": str(sheet1_path),
            "size": [1024, 768],
            "sha256": sheet1_sha256,
        },
        "publicBase": "/ui/frames/",
        "count": len(frame_items),
        "provenance": {
            "origin": "26063: Позывной «Синоптик» — UI Frames & Controls Batch v2",
            "author": "pixel-asset-pipeline-engineer",
            "license": "project-internal-production",
            "policy": "Nearest-neighbor clean pixel art, strictly binary alpha (0 or 255)",
        },
        "items": frame_items,
    }

    manifest_icons_path = manifests_dir / "ui.icons.v2.json"
    manifest_frames_path = manifests_dir / "ui.frames.v2.json"

    manifest_icons_path.write_text(json.dumps(icons_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_frames_path.write_text(json.dumps(frames_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {manifest_icons_path}")
    print(f"Wrote {manifest_frames_path}")

    print("\n=== 4. Verification Summary ===")
    total_icon_files = len(list(icons_src.glob("*.png"))) + len(list(icons_rt.glob("*.png")))
    total_frame_files = len(list(frames_src.glob("*.png"))) + len(list(frames_rt.glob("*.png")))
    print(f"Total icon files on disk: {total_icon_files} (source + public runtime)")
    print(f"Total frame files on disk: {total_frame_files} (source + public runtime)")
    print("ALL ASSETS CLEAN, BINARY ALPHA VERIFIED, READY FOR REVIEW.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
