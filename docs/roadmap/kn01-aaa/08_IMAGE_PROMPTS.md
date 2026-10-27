# 08. Промпты и требования к изображениям уровня КН-01

**Статус:** принято к изготовлению владельцем проекта. Файл собирается командой `python tools/assets/kn01_image_specs.py` из `tools/assets/kn01_image_specs.py`; правки — только там.

Всего изображений: **206**. Машинный реестр для проверки: `assets/source/kn01_level1.image-spec.json`.

## 1. Общие требования к каждому файлу

1. Формат: PNG, 8 бит на канал, RGBA (цвет-тип 6) или RGB для непрозрачных, без чересстрочной развёртки, без цветового профиля.
2. Размер — **точно** указанный в карточке, в логических пикселях. Никакого масштабирования в файле: увеличение делает игра целым коэффициентом.
3. Прозрачность: «прозрачный фон» — альфа только 0 или 255, никаких полупрозрачных пикселей; «непрозрачный» — альфа 255 везде.
4. Цвета — только из мастер-палитры `assets/source/palettes/master_26063_v2.gpl` (для персонажей ещё `people_26063_v1.gpl`). Число цветов не больше указанного.
5. Листы анимации: ряды = состояния, колонки = кадры слева направо; все кадры одного размера; пустые ячейки полностью прозрачны; точка опоры одинакова во всех кадрах.
6. Никакого текста, букв и цифр в генерируемых изображениях. Надписи («26063», «ПРИНЯТО» и т. п.) наносятся вручную шрифтами `PixCyrillic` 16 px или `Press Start 2P` 8 px.
7. Один промпт = один вызов генератора = один файл (`docs/design/sprites/GENERATION_SERIES_CONTRACT.md`). Черновики сохранять как `<имя>__candidate-NN.png` рядом с итоговым путём.
8. Животные, персонажи, одежда и все листы анимации — только черновик генератора; кадры доводятся вручную (`docs/design/sprites/GENERATION_AND_ARTWORK_RULES.md`, §2–5).

## 2. Как сделать файл из результата генератора

Генераторы не умеют выдавать точные 480×270 и чистую палитру. Порядок:

1. Генерировать в кратном размере (рекомендуется ×8: для 480×270 — 3840×2160; для кадра 16×16 — 128×128 на ячейку) на ровном фоне **#FF00FF** (для прозрачных ассетов) — этот цвет не входит в палитру и вырезается.
2. Выполнить нормализацию — она уменьшит изображение блочным большинством, вырежет фон, приведёт цвета к палитре и запишет файл по нужному пути:

```bash
python tools/assets/normalize_candidate.py путь/к/сырому.png HUB-L6-GROUND
```

3. Доработать в Aseprite: одиночные пиксели, контуры, точки опоры кадров.
4. Проверить:

```bash
python tools/validate_pixel_art.py
```

Валидатор показывает по каждому ассету: «ожидается» (файла нет), «ок» или конкретные ошибки (размер, альфа, число цветов, цвет вне палитры, сетка кадров).

### 2.1. Общий фрагмент промпта (добавлять в начало каждого промпта)

```text
STYLE LOCK: modern high-quality pixel art (reference feel: Eastward, Sea of Stars, A Short Hike), crisp hard-edged square pixels on a strict logical pixel grid, deliberate clusters of 2+ pixels, no anti-aliasing blur, no soft gradients (only ordered 2x2 dithering, max 3 bands), no noise, no photographic texture, no painterly brush strokes, no 3D-render look. Light from upper-left. Outlines are a darker shade of the local colour, never pure black. World: fictional cozy scientific meteorological campus on the shore of the Gulf of Finland near St Petersburg, North-West Russia: flat low horizon, water, birch and pine, granite embankments, ochre and terracotta facades, warm amber windows against a cool blue night. Absolutely no mountains or hills, no palms, no text, letters, digits or logos anywhere in the image, no UI, no watermark, no signature, no frame around the picture.
```

Негативный промпт для всех:

```text
blurry, anti-aliased, smooth gradient, painterly, oil painting, watercolor, 3d render, photo, noise, jpeg artifacts, text, letters, numbers, logo, watermark, signature, mountains, hills, alps, palm trees, chromatic aberration, bloom, lens flare, isometric perspective drift
```

### 2.2. Палитра по рампам

| Рампа | Цвета |
|---|---|
| night | `#070D1E #0E1A35 #18284D #263B66 #3A5383` |
| twilight | `#4B3A6E #7A4C80 #B2607F #E08A7A #F4B98A` |
| day | `#5E8FC4 #8DB7DE #C4DDF0` |
| water | `#0B2236 #143A52 #22566F #3E7C93 #8DBFCF` |
| foliage | `#0F241B #1B3A2A #2A5638 #3F7546 #6A9A55 #A3C46B` |
| birch_snow | `#4A4740 #B9B2A0 #E9E4D6 #F4F7FA` |
| stone | `#2D323C #464C58 #656C78 #8D939C #B9BDC2` |
| facade | `#6B3A2C #9A5838 #C98A4E #E6C07A` |
| window | `#B8642A #F29F45 #FFC768 #FFE7A0` |
| ui_teal | `#0C2A33 #143F4C #1B5660 #367C8B #6F9E95` |
| paper | `#BFAF8A #E2D6B6 #F3ECD8` |
| ink | `#1E2430 #2A303F #4B5263` |
| marks | `#B8423A (красный карандаш) #2F6E5A (штамп)` |
| accent | `#B88626 #F2C75C #FFDD83` |
| state | `#5FAF78 #D89A52 #D65E5E #7FB8D8` |
| people | `кожа #F2C9A8/#D9A07E, #D9A07A/#B97850, #B9784E/#8E5434, #7A4A30/#563220; волосы #2B211C #5A3A26 #A0703E #D8B66A #9A9AA4` |

Рампа `people` (кожа и волосы) отсутствовала в утверждённой палитре v2 и **предлагается** в `assets/source/palettes/people_26063_v1.gpl`; её утверждает `art-director` в рамках W1-06. Аватар рисуется тоном кожи `skin_1` и волосами `hair_dark`; остальные тона подставляет код.

### 2.3. Раскладка хаба (480×270), чтобы слои совпали

```text
y 0–96    небо (L0), облака (L1, y 20–80)
y 74–104  горизонт: город и залив (L2)
y 100–124 вода у набережной (L3)
y 118–126 гранитная набережная (L6)
y 126–152 верхняя терраса; основания зданий заднего ряда на y=152:
          радар x=52, картография x=136, архив x=344, аэрология x=432
y 152–204 нижняя терраса; оперативный зал: основание x=240, y=200; турнирный зал x=392, y=204
y 196–236 метеоплощадка x 24–140 (будка, мачта анемометра, ветроуказатель)
y 230–270 площадь с фонарями и клумбой
x 0–72 / 408–480 — берёза и сосна переднего плана (L9)
```

## 3. Карточки изображений

### Ключевые кадры (эталоны приёмки)

#### `KF-01` — Титульный экран

- **Файл:** `design/pixel-art/keyframes/kf-01-title.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, water, window, facade, stone, foliage, birch_snow
- **Содержание:** Ночной вид с гранитной набережной через воду на кампус: низкий горизонт на y≈150, три здания с тёплыми окнами, радарный купол, мачта с красным огнём, отражения окон в воде, берёза слева на переднем плане, фонарь. Верхняя треть кадра — спокойное небо (место под знак 26063 и подзаголовок). Нижняя полоса y 220–270 — тёмная набережная (место под кнопки).
- **Нельзя:** Не рисовать надписи, знак 26063, кнопки — только пустые спокойные области под них.
- **После генерации:** Сверить с палитрой, убрать одиночные пиксели, проверить, что верх и низ пусты под интерфейс.

```text
Night view across calm water to a small scientific meteorological campus, seen from a granite embankment. Low flat horizon at 55% of image height, three modest buildings with warm amber windows, a white radar dome on a short tower, a slim mast with a red obstruction light, long vertical window reflections on the water, a birch tree framing the left edge, one embankment lamp. Upper third is empty calm night sky with a few stars; bottom band is a dark empty embankment. Quiet, cozy, professional mood.
```

#### `KF-02` — Хаб ночью (композиция)

- **Файл:** `design/pixel-art/keyframes/kf-02-hub-night.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, water, window, facade, stone, foliage
- **Содержание:** Полная композиция хаба по раскладке §2.3 этого документа ночью: 6 зданий на двух террасах, вода и залив за ними, метеоплощадка слева внизу, площадь с фонарями внизу. Оперативный зал в центре — самый яркий.
- **После генерации:** Это эталон композиции, а не рабочий слой; рабочие слои — HUB-*, BLD-*.

```text
Wide 16:9 view of a cozy meteorological research campus at night on the Gulf of Finland shore. Two terraces: back row of four buildings (radar tower with white dome far left, cartography classroom, archive with tall windows, aerology pavilion with a balloon hangar far right), front row with a large glass operations hall in the centre glowing warmly and a tournament hall on the right. Behind: calm water and a distant low city skyline with tiny lights. Bottom-left: fenced weather observation plot with a white louvered instrument screen and an anemometer mast. Bottom: paved plaza with lamps, birch and pine framing the edges.
```

#### `KF-03` — Хаб днём

- **Файл:** `design/pixel-art/keyframes/kf-03-hub-day.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** day, water, facade, stone, foliage, birch_snow
- **Содержание:** Та же композиция, что KF-02, ясный летний день: окна почти не светятся, короткие тени, облака отбрасывают тени на двор.

```text
Same campus composition as the night keyframe but on a clear summer day: soft blue sky with a few cumulus clouds, short shadows to the lower-right, windows dark, cloud shadows on the lawns, sparkling water.
```

#### `KF-04` — Кодовый пост во время задания

- **Файл:** `design/pixel-art/keyframes/kf-04-codepost-task.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, window, facade, stone, paper, ink, ui_teal, accent
- **Содержание:** Интерьер поста ночью (см. ROOM-CODEPOST-SHELL) с наложенным интерфейсом-заглушкой: длинная бумажная лента через верхнюю треть, бумажный бланк в центре, портрет наставника слева внизу, мини-схема станции справа, янтарная кнопка «Проверить». Все тексты — серые полосы-заглушки.
- **Нельзя:** Не генерировать буквы; текст обозначается полосами.

```text
Cozy night interior of a small teletype code room at a weather station, warm desk lamp light. Overlaid flat pixel UI mock-up: a long cream paper telegram tape with perforated edges across the upper third, a cream paper form card in the centre with grey placeholder bars instead of text, a small framed character portrait at bottom-left, a small square panel at right, one amber button at the bottom of the form.
```

#### `KF-05` — Разбор ошибки по цифрам

- **Файл:** `design/pixel-art/keyframes/kf-05-error-breakdown.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, paper, ink, marks, ui_teal, accent
- **Содержание:** Крупный бланк разбора: пять ячеек цифр (пустые прямоугольники), под ними скобки-подписи (полосы), одна ячейка обведена красным карандашом, справа зачёркнутая и правильная интерпретация (полосы).

```text
Close-up of a cream paper worksheet on a dark desk: five empty square digit cells in a row, small brackets under groups of cells, one cell circled with a hand-drawn red pencil ellipse, grey placeholder bars for text, a green ink rubber-stamp mark in the corner.
```

#### `KF-06` — Сводка смены

- **Файл:** `design/pixel-art/keyframes/kf-06-shift-summary.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, paper, ink, accent, state, ui_teal
- **Содержание:** Планшет с зажимом и листом журнала: заголовок-полоса, три крупных числовых блока (пустые), 5 полос освоения разной длины, блок награды с иконкой карандаша, подпись-росчерк, две кнопки внизу.

```text
A clipboard with a cream logbook sheet on a dark wooden desk at night: a title placeholder bar, three empty stat boxes, five horizontal progress bars of different lengths in green, a small reward box with a pencil icon, a hand-written signature scribble, two buttons at the bottom (one amber, one teal).
```

#### `KF-07` — Разблокировка здания

- **Файл:** `design/pixel-art/keyframes/kf-07-unlock.png` · **задача:** W1-06
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 64
- **Рампы:** night, window, facade, stone, foliage, water
- **Содержание:** Хаб ночью, кадр приближен к Картографическому классу: половина окон загорелась, раскрытый замок над входом, три голубя взлетают с крыши.

```text
Night close-up of a two-storey ochre classroom building on a campus terrace: windows lighting up one by one from left to right (half lit, half dark), a small opened padlock icon floating above the entrance, three pigeons taking off from the roof, calm water behind.
```

### Хаб: слои сцены (480×270)

#### `HUB-L0-SKY-NIGHT` — Небо: night

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_night.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** night, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: ночь: от #070D1E вверху к #263B66 у горизонта, 2 полосы дизеринга. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  от #070D1E вверху к #263B66 у горизонта, 2 полосы дизеринга
```

#### `HUB-L0-SKY-DAWN` — Небо: dawn

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_dawn.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** twilight, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: рассвет: вверху #263B66, к горизонту #7A4C80 → #E08A7A → #F4B98A. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  вверху #263B66, к горизонту #7A4C80 → #E08A7A → #F4B98A
```

#### `HUB-L0-SKY-DAY` — Небо: day

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_day.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** day, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: день: вверху #5E8FC4, к горизонту #C4DDF0. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  вверху #5E8FC4, к горизонту #C4DDF0
```

#### `HUB-L0-SKY-GOLDEN` — Небо: golden

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_golden.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** twilight, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: золотой час: вверху #8DB7DE, к горизонту #F4B98A и #E6C07A. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  вверху #8DB7DE, к горизонту #F4B98A и #E6C07A
```

#### `HUB-L0-SKY-DUSK` — Небо: dusk

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_dusk.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** twilight, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: сумерки: вверху #18284D, середина #4B3A6E, у горизонта #B2607F. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  вверху #18284D, середина #4B3A6E, у горизонта #B2607F
```

#### `HUB-L0-SKY-WHITENIGHT` — Небо: whitenight

- **Файл:** `assets/source/environment/hub/v3/hub_l0_sky_whitenight.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 10
- **Рампы:** twilight, night, day
- **Место в сцене:** Слой L0, весь кадр; виден участок y 0–100
- **Содержание:** Только небо, без облаков, звёзд, солнца и земли. Вертикальная смена цвета: белая ночь (июнь): вверху #3A5383, к горизонту светлый #C4DDF0 и #F4B98A, без звёзд. Горизонт проходит на y=96; ниже 96 — продолжение нижнего цвета.

```text
Empty sky background only, horizontal colour bands with 2x2 ordered dithering between bands, no clouds, no stars, no sun, no ground.  вверху #3A5383, к горизонту светлый #C4DDF0 и #F4B98A, без звёзд
```

#### `HUB-L0-CELESTIAL` — Солнце и луна

- **Файл:** `assets/source/environment/hub/v3/hub_l0_celestial.png` · **задача:** W2-10
- **Размер:** 48×16; кадр 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** window, birch_snow, stone
- **Раскладка листа:** 1 ряд × 3 кадра: солнце, полная луна, растущий месяц
- **Точка опоры:** центр кадра
- **Содержание:** Диски 10–12 px в кадре 16×16, без лучей и ореолов; луна с 2–3 пятнами морей.
- **После генерации:** Звёзды рисуются кодом (точки 1×1); отдельный ассет не нужен.

```text
Three tiny pixel sprites side by side on transparent background: a warm sun disc, a full moon with two subtle maria, a crescent moon. No glow, no rays.
```

#### `HUB-L1-CLOUDS-FAR` — Дальние облака

- **Файл:** `assets/source/environment/hub/v3/hub_l1_clouds_far.png` · **задача:** W2-10
- **Размер:** 256×32; кадр 64×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow
- **Раскладка листа:** 1 ряд × 4 варианта облаков
- **Место в сцене:** Слой L1, y 20–80, дрейф
- **Содержание:** Четыре разных плоских слоистых облака, 3 тона: тень #8D939C, тело #B9BDC2, верх #E9E4D6. Тонирование по фазе суток делает код.

```text
Four separate flat stratocumulus cloud sprites in a row, each fits a 64x32 cell, three flat tones (shadow, body, highlight), soft pixel-cluster edges, transparent background.
```

#### `HUB-L2-HORIZON` — Горизонт: залив, город, лес

- **Файл:** `assets/source/environment/hub/v3/hub_l2_horizon.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 20
- **Рампы:** night, water, stone, foliage
- **Место в сцене:** Слой L2; содержимое только в полосе y 70–104, остальное прозрачно
- **Содержание:** Полоса воды залива y 96–104 (#22566F/#3E7C93), за ней низкий силуэт города y 74–96: ряды крыш, 2–3 купола и 1–2 тонких шпиля без узнаваемых реальных зданий, слева тёмная кромка леса. Цвета дальнего плана — холодные, низкий контраст.
- **Нельзя:** Не рисовать узнаваемые достопримечательности (Петропавловский шпиль, Исаакий, Лахта-центр).

```text
Distant low city skyline silhouette across a calm bay, very low contrast cool blue tones, rows of roofs with a couple of small domes and thin spires (generic, not recognisable landmarks), dark forest edge on the left, a thin strip of water in front. Everything else transparent.
```

#### `HUB-L2-CITYLIGHTS` — Огни города

- **Файл:** `assets/source/environment/hub/v3/hub_l2_citylights.png` · **задача:** W2-10
- **Размер:** 960×270; кадр 480×270 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Раскладка листа:** 1 ряд × 2 кадра (мерцание)
- **Частота:** 1 кадр/с
- **Содержание:** Только огни — точки 1×1 и пары 2×1 цветами #FFC768/#FFE7A0, строго поверх силуэта HUB-L2-HORIZON; во втором кадре 15% огней погашены/переставлены.

```text
Only tiny warm city light dots (single pixels and pairs) placed along a distant skyline band, two frames for flicker, everything else transparent.
```

#### `HUB-L3-WATER` — Вода у набережной

- **Файл:** `assets/source/environment/hub/v3/hub_l3_water.png` · **задача:** W2-10
- **Размер:** 480×96; кадр 480×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** water
- **Раскладка листа:** 4 ряда × 1 кадр (анимация бликов)
- **Частота:** 3 кадр/с
- **Место в сцене:** Слой L3, y 100–124
- **Содержание:** Полоса воды 24 px: основной #143A52, полосы #22566F, блики 2–6 px #3E7C93/#8DBFCF; в каждом кадре блики смещены, цикл бесшовный.

```text
A horizontal band of calm dark water seen from above at low angle, short horizontal highlight dashes, four animation frames stacked vertically for a seamless shimmer loop.
```

#### `HUB-L4-FOG` — Туман над водой

- **Файл:** `assets/source/environment/hub/v3/hub_l4_fog.png` · **задача:** W2-10
- **Размер:** 480×96; кадр 480×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** birch_snow, stone
- **Раскладка листа:** 3 ряда: три варианта полос тумана
- **Место в сцене:** Слой L4, рассвет
- **Содержание:** Горизонтальные полосы дизеринга 2×2 цветами #E9E4D6 и #B9BDC2 на прозрачном фоне; плотность 25–50%.

```text
Three variations of thin horizontal morning fog strips made only of 2x2 ordered dither pattern, transparent background, stacked vertically.
```

#### `HUB-L6-GROUND` — Земля, террасы, дорожки, метеоплощадка

- **Файл:** `assets/source/environment/hub/v3/hub_l6_ground.png` · **задача:** W2-10
- **Размер:** 480×270 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 32
- **Рампы:** stone, foliage, birch_snow, facade
- **Место в сцене:** Слой L6; содержимое y 118–270
- **Содержание:** Гранитная набережная y 118–126; верхняя терраса y 126–152 (газон, дорожка, низкие кусты), подпорная стена и две лестницы; нижняя терраса y 152–200; метеоплощадка x 24–140, y 196–236: квадрат светлого гравия #B9BDC2 с низким белым штакетником; площадь y 230–270 мощёная (#656C78/#8D939C), клумба по центру. Места под здания (см. §2.3) — ровная земля без деталей.
- **Нельзя:** Не рисовать здания, фонари, деревья выше 12 px, людей.

```text
Top part transparent. Lower part: granite embankment edge, two landscaped terraces with lawns, low shrubs, stone retaining walls and two stairways, a paved plaza at the bottom with a round flowerbed, and on the lower-left a small square of light gravel fenced with a low white picket fence (weather observation plot). Flat empty ground where buildings will be placed. Slight top-down 3/4 view, consistent across the image.
```

#### `HUB-L9-FG-BIRCH` — Берёза переднего плана (слева)

- **Файл:** `assets/source/environment/hub/v3/hub_l9_fg_birch.png` · **задача:** W2-10
- **Размер:** 144×200; кадр 72×200 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** birch_snow, foliage
- **Раскладка листа:** 1 ряд × 2 кадра (покачивание)
- **Частота:** 2 кадр/с
- **Точка опоры:** низ ствола
- **Место в сцене:** Левый край кадра, x 0–72, y 70–270
- **Содержание:** Ствол белый с тёмными чечевичками, свисающие ветви; во втором кадре крона смещена на 1 px.

```text
Foreground birch tree hugging the left frame edge, white trunk with dark marks, drooping branches with small leaf clusters, two frames with a 1-pixel sway, transparent background.
```

#### `HUB-L9-FG-PINE` — Сосна переднего плана (справа)

- **Файл:** `assets/source/environment/hub/v3/hub_l9_fg_pine.png` · **задача:** W2-10
- **Размер:** 144×200; кадр 72×200 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** foliage, facade, stone
- **Раскладка листа:** 1 ряд × 2 кадра
- **Частота:** 2 кадр/с
- **Точка опоры:** низ ствола
- **Место в сцене:** Правый край, x 408–480
- **Содержание:** Рыжий ствол (#9A5838), тёмная хвоя ярусами.

```text
Foreground Scots pine hugging the right frame edge, orange-brown trunk, dark layered needle clumps, two frames with a 1-pixel sway, transparent background.
```

#### `HUB-L10-WEATHER` — Частицы снега и дождя

- **Файл:** `assets/source/environment/hub/v3/hub_l10_weather.png` · **задача:** W2-10
- **Размер:** 32×8; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** birch_snow, water
- **Раскладка листа:** 1 ряд × 4: снежинка 1×1, снежинка 2×2, капля 1×3, капля 1×4
- **Содержание:** Крошечные частицы для системы частиц.
- **После генерации:** Можно нарисовать вручную за минуту; генерация не нужна.

```text
Four tiny particle sprites: 1px snowflake, 2x2 snowflake, 1x3 raindrop, 1x4 raindrop.
```

### Хаб: здания (слой L5)

#### `BLD-SYNOPTIC-DAY` — Оперативный зал (кодовый пост): day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_synoptic_day.png` · **задача:** W2-10
- **Размер:** 128×84 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** центр, нижний ряд, основание по центру x=240, y=200
- **Содержание:** Двухэтажный павильон с большой стеклянной стеной-витриной, сквозь которую видны столы и карты; плоская кровля с антеннами; широкий вход по центру с козырьком. Самое тёплое и приветливое здание. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Two-storey glass-fronted operations pavilion, large window wall showing desks and wall maps inside, flat roof with small antennas, wide central entrance with a canopy, welcoming and modern-Soviet-scientific.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-SYNOPTIC-NIGHT` — Оперативный зал (кодовый пост): night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_synoptic_night.png` · **задача:** W2-10
- **Размер:** 128×84 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** центр, нижний ряд, основание по центру x=240, y=200
- **Содержание:** Двухэтажный павильон с большой стеклянной стеной-витриной, сквозь которую видны столы и карты; плоская кровля с антеннами; широкий вход по центру с козырьком. Самое тёплое и приветливое здание. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Two-storey glass-fronted operations pavilion, large window wall showing desks and wall maps inside, flat roof with small antennas, wide central entrance with a canopy, welcoming and modern-Soviet-scientific.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-SYNOPTIC-WINDOWS` — Оперативный зал (кодовый пост): маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_synoptic_windows.png` · **задача:** W2-11
- **Размер:** 128×84 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** центр, нижний ряд, основание по центру x=240, y=200
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

### Хаб: здания (слой L5)

#### `BLD-CARTOGRAPHY-DAY` — Картографический класс: day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_cartography_day.png` · **задача:** W2-10
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=136, y=152
- **Содержание:** Двухэтажное охристое здание с высокими окнами и треугольным фронтоном, над входом небольшой круглый глобус-флюгер. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Two-storey ochre classroom building with tall windows, a small pediment, a little globe finial above the entrance.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-CARTOGRAPHY-NIGHT` — Картографический класс: night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_cartography_night.png` · **задача:** W2-10
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=136, y=152
- **Содержание:** Двухэтажное охристое здание с высокими окнами и треугольным фронтоном, над входом небольшой круглый глобус-флюгер. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Two-storey ochre classroom building with tall windows, a small pediment, a little globe finial above the entrance.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-CARTOGRAPHY-WINDOWS` — Картографический класс: маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_cartography_windows.png` · **задача:** W2-11
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=136, y=152
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

### Хаб: здания (слой L5)

#### `BLD-ARCHIVE-DAY` — Научный архив: day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_archive_day.png` · **задача:** W2-10
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=344, y=152
- **Содержание:** Терракотовое кирпичное здание с арочными окнами, тяжёлой дверью и коробками за окнами первого этажа. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Terracotta brick archive building with arched windows, a heavy wooden door, shelves with boxes visible through ground-floor windows.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-ARCHIVE-NIGHT` — Научный архив: night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_archive_night.png` · **задача:** W2-10
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=344, y=152
- **Содержание:** Терракотовое кирпичное здание с арочными окнами, тяжёлой дверью и коробками за окнами первого этажа. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Terracotta brick archive building with arched windows, a heavy wooden door, shelves with boxes visible through ground-floor windows.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-ARCHIVE-WINDOWS` — Научный архив: маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_archive_windows.png` · **задача:** W2-11
- **Размер:** 88×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, основание x=344, y=152
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

### Хаб: здания (слой L5)

#### `BLD-RADAR-DAY` — Радарный комплекс: day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_radar_day.png` · **задача:** W2-10
- **Размер:** 56×96 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний левый, основание x=52, y=152
- **Содержание:** Бетонная башня с белым радиопрозрачным куполом наверху, на крыше вспомогательного блока — открытая вращающаяся антенна (отдельный ассет PROP-RADAR-ANTENNA), красный огонь на верхушке. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Concrete tower topped with a white geodesic radome, small service block at its base, red obstruction light point on top.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-RADAR-NIGHT` — Радарный комплекс: night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_radar_night.png` · **задача:** W2-10
- **Размер:** 56×96 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний левый, основание x=52, y=152
- **Содержание:** Бетонная башня с белым радиопрозрачным куполом наверху, на крыше вспомогательного блока — открытая вращающаяся антенна (отдельный ассет PROP-RADAR-ANTENNA), красный огонь на верхушке. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Concrete tower topped with a white geodesic radome, small service block at its base, red obstruction light point on top.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-RADAR-WINDOWS` — Радарный комплекс: маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_radar_windows.png` · **задача:** W2-11
- **Размер:** 56×96 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний левый, основание x=52, y=152
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

### Хаб: здания (слой L5)

#### `BLD-AEROLOGY-DAY` — Аэрологический павильон: day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_aerology_day.png` · **задача:** W2-10
- **Размер:** 72×80 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний правый, основание x=432, y=152
- **Содержание:** Невысокий ангар с широкими воротами для выпуска зондов, рядом решётчатая мачта, на крыше белый шар-зонд в сетке. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Low hangar-like pavilion with wide doors for radiosonde balloon launches, a lattice mast beside it, a white balloon resting in a net on the roof.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-AEROLOGY-NIGHT` — Аэрологический павильон: night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_aerology_night.png` · **задача:** W2-10
- **Размер:** 72×80 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний правый, основание x=432, y=152
- **Содержание:** Невысокий ангар с широкими воротами для выпуска зондов, рядом решётчатая мачта, на крыше белый шар-зонд в сетке. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: Low hangar-like pavilion with wide doors for radiosonde balloon launches, a lattice mast beside it, a white balloon resting in a net on the roof.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-AEROLOGY-WINDOWS` — Аэрологический павильон: маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_aerology_windows.png` · **задача:** W2-11
- **Размер:** 72×80 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** задний ряд, крайний правый, основание x=432, y=152
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

### Хаб: здания (слой L5)

#### `BLD-TOURNAMENT-DAY` — Турнирный зал: day

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_tournament_day.png` · **задача:** W2-10
- **Размер:** 112×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, day, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** нижний ряд справа, основание x=392, y=204
- **Содержание:** Одноэтажный зал с полукруглой кровлей, флажками команд (без символики) и широкими окнами. Вариант: дневное освещение, окна тёмные (#2D323C/#464C58 с бликом #8DB7DE).
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: One-storey hall with a barrel-vault roof, row of wide windows, small plain team pennants without symbols.. Lighting: daylight, dark window glass with a sky reflection.
```

#### `BLD-TOURNAMENT-NIGHT` — Турнирный зал: night

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_tournament_night.png` · **задача:** W2-10
- **Размер:** 112×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 28
- **Рампы:** facade, stone, window, night, foliage
- **Точка опоры:** низ по центру
- **Место в сцене:** нижний ряд справа, основание x=392, y=204
- **Содержание:** Одноэтажный зал с полукруглой кровлей, флажками команд (без символики) и широкими окнами. Вариант: ночное освещение, стены в холодной тени, 60–70% окон светятся #FFC768/#F29F45.
- **Нельзя:** Без вывесок и надписей (табличку рисует интерфейс), без земли и теней за пределами основания.
- **После генерации:** Контур силуэта должен совпадать пиксель в пиксель у дневного и ночного вариантов.

```text
Single building sprite on transparent background, 3/4 front view matching a gentle top-down campus perspective: One-storey hall with a barrel-vault roof, row of wide windows, small plain team pennants without symbols.. Lighting: night, walls in cool shadow, most windows glowing warm amber.
```

### Хаб: состояния зданий

#### `BLD-TOURNAMENT-WINDOWS` — Турнирный зал: маска окон

- **Файл:** `assets/source/environment/hub/v3/buildings/bld_tournament_windows.png` · **задача:** W2-11
- **Размер:** 112×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** window
- **Точка опоры:** низ по центру
- **Место в сцене:** нижний ряд справа, основание x=392, y=204
- **Содержание:** Только светящиеся стёкла окон того же здания, точно по их положению на BLD-*-NIGHT; всё остальное прозрачно. Используется для анимации «окна загораются по одному».
- **После генерации:** Проще всего вырезать из ночного варианта вручную.

```text
Mask layer: only the lit window panes of the building, warm amber, exact same positions as the night sprite, everything else transparent.
```

#### `STATE-LOCK` — Замок над входом (раскрытие)

- **Файл:** `assets/source/ui/location-states/v3/state_lock.png` · **задача:** W2-11
- **Размер:** 28×8; кадр 7×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** accent, stone
- **Раскладка листа:** 1 ряд × 4: закрыт → дужка поднимается → открыт → открыт и гаснет
- **Частота:** 8 кадр/с
- **Точка опоры:** низ по центру

```text
Tiny brass padlock icon, 4 frames: closed, shackle lifting, open, open fading.
```

#### `STATE-BEACON` — Маячок доступной цели

- **Файл:** `assets/source/ui/location-states/v3/state_beacon.png` · **задача:** W2-11
- **Размер:** 15×5; кадр 5×5 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** accent
- **Раскладка листа:** 1 ряд × 3 кадра пульса
- **Частота:** 2,5 кадр/с
- **Точка опоры:** центр

```text
Tiny 5x5 four-pointed amber star, 3 pulse frames (small, medium, large).
```

#### `SCR-SILHOUETTE-CARTOGRAPHY` — Силуэт интерьера: Картографический класс

- **Файл:** `assets/source/ui/location-states/v3/silhouette_cartography.png` · **задача:** W2-11
- **Размер:** 96×64 · **фон:** непрозрачный · **цветов не больше:** 6
- **Рампы:** ui_teal, night
- **Содержание:** Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.

```text
Monochrome dark-teal silhouette illustration of the interior of a Картографический класс at a weather station, recognisable furniture and instruments, two tones only, mysterious but friendly.
```

#### `SCR-SILHOUETTE-ARCHIVE` — Силуэт интерьера: Архив

- **Файл:** `assets/source/ui/location-states/v3/silhouette_archive.png` · **задача:** W2-11
- **Размер:** 96×64 · **фон:** непрозрачный · **цветов не больше:** 6
- **Рампы:** ui_teal, night
- **Содержание:** Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.

```text
Monochrome dark-teal silhouette illustration of the interior of a Архив at a weather station, recognisable furniture and instruments, two tones only, mysterious but friendly.
```

#### `SCR-SILHOUETTE-RADAR` — Силуэт интерьера: Радар

- **Файл:** `assets/source/ui/location-states/v3/silhouette_radar.png` · **задача:** W2-11
- **Размер:** 96×64 · **фон:** непрозрачный · **цветов не больше:** 6
- **Рампы:** ui_teal, night
- **Содержание:** Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.

```text
Monochrome dark-teal silhouette illustration of the interior of a Радар at a weather station, recognisable furniture and instruments, two tones only, mysterious but friendly.
```

#### `SCR-SILHOUETTE-AEROLOGY` — Силуэт интерьера: Аэрология

- **Файл:** `assets/source/ui/location-states/v3/silhouette_aerology.png` · **задача:** W2-11
- **Размер:** 96×64 · **фон:** непрозрачный · **цветов не больше:** 6
- **Рампы:** ui_teal, night
- **Содержание:** Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.

```text
Monochrome dark-teal silhouette illustration of the interior of a Аэрология at a weather station, recognisable furniture and instruments, two tones only, mysterious but friendly.
```

#### `SCR-SILHOUETTE-TOURNAMENT` — Силуэт интерьера: Турнирный зал

- **Файл:** `assets/source/ui/location-states/v3/silhouette_tournament.png` · **задача:** W2-11
- **Размер:** 96×64 · **фон:** непрозрачный · **цветов не больше:** 6
- **Рампы:** ui_teal, night
- **Содержание:** Для досье закрытого здания (S07): интерьер одним-двумя тонами бирюзы как «засвеченный» силуэт, узнаваемые предметы помещения.

```text
Monochrome dark-teal silhouette illustration of the interior of a Турнирный зал at a weather station, recognisable furniture and instruments, two tones only, mysterious but friendly.
```

### Хаб: пропсы (слой L7)

#### `PROP-LAMP` — Фонарь

- **Файл:** `assets/source/props/hub/prop_lamp.png` · **задача:** W2-10
- **Размер:** 16×24; кадр 8×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, window
- **Раскладка листа:** 1 ряд × 2: выключен, включён
- **Точка опоры:** низ по центру

```text
Old-style park street lamp on a thin dark pole, 2 frames: off, on (warm lamp head).
```

#### `PROP-LAMP-GLOW` — Световое пятно фонаря

- **Файл:** `assets/source/props/hub/prop_lamp_glow.png` · **задача:** W2-10
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** window
- **Точка опоры:** центр
- **Содержание:** Конус и пятно на земле из дизеринга 2×2 в 3 ступени #FFE7A0→#FFC768→#F29F45, без полупрозрачности.

```text
Pool of warm lamp light on the ground made only of ordered dither pattern in three rings, transparent background.
```

#### `PROP-BENCH` — Скамейка

- **Файл:** `assets/source/props/hub/prop_bench.png` · **задача:** W2-10
- **Размер:** 16×10 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** facade, stone
- **Точка опоры:** низ по центру

```text
Small wooden park bench with cast-iron legs, 3/4 view.
```

#### `PROP-STEVENSON` — Метеобудка

- **Файл:** `assets/source/props/hub/prop_stevenson.png` · **задача:** W2-10
- **Размер:** 24×16; кадр 12×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** birch_snow, stone
- **Раскладка листа:** 1 ряд × 2: дверца закрыта, открыта
- **Точка опоры:** низ по центру
- **Содержание:** Белая жалюзийная будка на четырёх ножках (психрометрическая будка).

```text
White louvered meteorological instrument shelter (Stevenson screen) on four legs, 2 frames: door closed, door open.
```

#### `PROP-ANEMOMETER` — Мачта с анемометром

- **Файл:** `assets/source/props/hub/prop_anemometer.png` · **задача:** W2-10
- **Размер:** 32×40; кадр 8×40 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow
- **Раскладка листа:** 1 ряд × 4 кадра вращения чашек
- **Частота:** 6 кадр/с
- **Точка опоры:** низ по центру

```text
Thin weather mast with a cup anemometer on top, 4 frames of cup rotation.
```

#### `PROP-FLAG` — Ветроуказатель-конус

- **Файл:** `assets/source/props/hub/prop_flag.png` · **задача:** W2-10
- **Размер:** 72×8; кадр 12×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** state, birch_snow
- **Раскладка листа:** 1 ряд × 6 кадров колыхания
- **Частота:** 6 кадр/с
- **Точка опоры:** левый край по центру
- **Содержание:** Полосатый ветровой конус (бело-оранжевый #F4F7FA/#D89A52), без государственной символики.

```text
Striped orange and white wind sock, 6 frames of gentle flapping, attached at the left edge.
```

#### `PROP-RADAR-ANTENNA` — Вращающаяся антенна

- **Файл:** `assets/source/props/hub/prop_radar_antenna.png` · **задача:** W2-10
- **Размер:** 192×16; кадр 24×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** stone, birch_snow
- **Раскладка листа:** 1 ряд × 8 положений поворота
- **Частота:** 4 кадр/с
- **Точка опоры:** низ по центру

```text
Small open parabolic radar antenna on a pedestal, 8 frames of a full rotation, side view.
```

#### `PROP-BEACON-LIGHT` — Красный огонь мачты

- **Файл:** `assets/source/props/hub/prop_beacon_light.png` · **задача:** W2-10
- **Размер:** 6×3; кадр 3×3 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** state
- **Раскладка листа:** 1 ряд × 2: погашен, горит
- **Точка опоры:** центр
- **Содержание:** #D65E5E и тёмный #6B3A2C.
- **После генерации:** Рисуется вручную.

```text
Tiny 3x3 red obstruction light, off and on.
```

#### `PROP-SIGNPOST` — Указатель станции

- **Файл:** `assets/source/props/hub/prop_signpost.png` · **задача:** W2-10
- **Размер:** 16×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, ui_teal
- **Точка опоры:** низ по центру
- **Содержание:** Столбик с пустой табличкой 14×6.
- **Нельзя:** Не генерировать цифры: «26063» наносится вручную шрифтом Press Start 2P 8 px.

```text
Small station signpost with a blank teal plate, no text.
```

#### `PROP-BICYCLE` — Велосипед у стойки

- **Файл:** `assets/source/props/hub/prop_bicycle.png` · **задача:** W2-10
- **Размер:** 18×11 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, ui_teal
- **Точка опоры:** низ по центру

```text
Simple city bicycle leaning on a stand, side view.
```

### Интерьер «Кодовый пост» (семейство M2)

#### `ROOM-CODEPOST-SHELL` — Комната поста (статичная основа)

- **Файл:** `assets/source/environment/rooms/codepost/room_codepost_shell.png` · **задача:** W2-12
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 48
- **Рампы:** night, facade, stone, paper, ink, window, ui_teal
- **Содержание:** Вид спереди, слегка сверху. Стены приглушённо-бирюзовые снизу (панели) и охристые сверху; деревянный пол. Слева окно x 24–120, y 40–112 (проём залить #18284D — туда кладётся ROOM-WINDOW-VIEW). Центр: большой стол x 150–330, столешница y 170. Место под телетайп x 190–286, y 106–170 пустое. Справа: шкаф с книгами и архивными коробками x 360–460, место под барограф на полке x 372–412, y 120–148, место под часы на стене x 300–364, y 30–70. На стене за столом приколота бланковая карта.
- **Нельзя:** Без людей, кота, телетайпа, часов, лампы и барографа — они отдельные анимированные ассеты. Без надписей на коробках.

```text
Cozy small teletype code room at a weather station at night, front view slightly from above. Teal wainscot panels, ochre upper walls, wooden floor. A window on the left (empty dark pane), a large wooden desk in the centre with an empty space on top, a bookcase with archive boxes on the right, a blank weather map pinned on the wall. Warm but dim lighting.
```

#### `ROOM-WINDOW-VIEW` — Вид из окна по фазам

- **Файл:** `assets/source/environment/rooms/codepost/room_window_view.png` · **задача:** W2-12
- **Размер:** 480×72; кадр 96×72 · **фон:** непрозрачный · **цветов не больше:** 24
- **Рампы:** night, twilight, day, foliage, water
- **Раскладка листа:** 1 ряд × 5: ночь, рассвет, день, золотой час, сумерки
- **Место в сцене:** В проём окна x 24–120, y 40–112
- **Содержание:** Двор кампуса и вода: ветка берёзы, крыша соседнего здания, подоконник снаружи (на него садится синица).

```text
Five versions of the same small view through a window: a campus roof, a birch branch and water, shown at night, dawn, day, golden hour and dusk.
```

#### `ROOM-WINDOW-RAIN` — Дождь по стеклу

- **Файл:** `assets/source/environment/rooms/codepost/room_window_rain.png` · **задача:** W2-12
- **Размер:** 384×72; кадр 96×72 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** water
- **Раскладка листа:** 1 ряд × 4 кадра
- **Частота:** 6 кадр/с

```text
Overlay of raindrops and short streaks on window glass, 4 frames, transparent background.
```

#### `ROOM-TELETYPE` — Телетайп

- **Файл:** `assets/source/environment/rooms/codepost/room_teletype.png` · **задача:** W2-12
- **Размер:** 384×128; кадр 96×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 16
- **Рампы:** ui_teal, stone, paper, ink
- **Раскладка листа:** ряд 1: покой (1 кадр, остальные ячейки пусты); ряд 2: печать, 4 кадра
- **Частота:** 12 кадр/с при печати
- **Точка опоры:** низ по центру
- **Место в сцене:** На столе x 190–286, y 106–170
- **Содержание:** Массивный аппарат цвета морской волны с клавиатурой, рулон бумаги сзади, лента выходит сверху; при печати двигается каретка и подаётся лента.
- **Нельзя:** Без букв на клавишах (только светлые прямоугольники).

```text
Vintage mid-century teletype machine in muted teal-green enamel on a desk, keyboard with blank keys, paper roll at the back, paper tape coming out on top. Row 1: idle frame. Row 2: four printing frames with the carriage moving and tape advancing.
```

#### `ROOM-BAROGRAPH` — Барограф

- **Файл:** `assets/source/environment/rooms/codepost/room_barograph.png` · **задача:** W2-12
- **Размер:** 160×28; кадр 40×28 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** facade, stone, paper, ink
- **Раскладка листа:** 1 ряд × 4: барабан поворачивается
- **Частота:** по таймеру раз в 30 с
- **Точка опоры:** низ по центру

```text
Recording barograph instrument in a wooden case with glass cover, rotating paper drum with a pen trace, 4 frames of slow drum rotation.
```

#### `ROOM-CLOCK` — Настенные часы UTC и местного времени

- **Файл:** `assets/source/environment/rooms/codepost/room_clock.png` · **задача:** W2-12
- **Размер:** 64×40 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, paper, ink
- **Точка опоры:** центр
- **Место в сцене:** Стена x 300–364, y 30–70
- **Содержание:** Двойные часы: два круглых циферблата в общем корпусе, деления рисками, без цифр и стрелок (стрелки — отдельный ассет).

```text
Wall-mounted double clock with two round dials in one dark case, tick marks only, no numbers, no hands.
```

#### `ROOM-CLOCK-HANDS` — Секундная стрелка

- **Файл:** `assets/source/environment/rooms/codepost/room_clock_hands.png` · **задача:** W2-12
- **Размер:** 128×16; кадр 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** ink, marks
- **Раскладка листа:** 1 ряд × 8 положений
- **Точка опоры:** центр
- **После генерации:** Рисуется вручную.

```text

```

#### `ROOM-LAMP` — Настольная лампа

- **Файл:** `assets/source/environment/rooms/codepost/room_lamp.png` · **задача:** W2-12
- **Размер:** 72×32; кадр 24×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, window, stone
- **Раскладка листа:** 1 ряд × 3: выключена, мерцание, включена
- **Точка опоры:** низ по центру

```text
Green-shaded desk lamp, 3 frames: off, flickering, on.
```

#### `ROOM-LAMP-GLOW` — Пятно света лампы

- **Файл:** `assets/source/environment/rooms/codepost/room_lamp_glow.png` · **задача:** W2-12
- **Размер:** 64×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** window
- **Точка опоры:** верх по центру
- **Содержание:** Дизеринг 2×2 в 3 ступени на прозрачном фоне.

```text
Warm dithered light pool cast by a desk lamp on a desk surface, three dither rings, transparent background.
```

### Фауна

#### `TIT-M1` — Большая синица (двор)

- **Файл:** `assets/source/animals/tit/tit_m1.png` · **задача:** W2-13
- **Размер:** 32×48; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 6 ряд(ов) × 4 колонок; ряды = состояния: idle 4 (4/с), поворот головы 2, прыжок 4 (10/с), клюёт 3 (8/с), взлёт 4 (12/с), полёт 4 (10/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Большая синица (двор). Состояния: idle 4 (4/с), поворот головы 2, прыжок 4 (10/с), клюёт 3 (8/с), взлёт 4 (12/с), полёт 4 (10/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 6 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 8x8 pixels, side view: Great tit: yellow belly with black stripe, black head with white cheeks, olive back.
```

#### `TIT-M2` — Большая синица (подоконник поста)

- **Файл:** `assets/source/animals/tit/tit_m2.png` · **задача:** W2-13
- **Размер:** 64×96; кадр 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 6 ряд(ов) × 4 колонок; ряды = состояния: idle 4, поворот головы 2, прыжок 4, клюёт 3, взлёт 4, полёт 4; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Большая синица (подоконник поста). Состояния: idle 4, поворот головы 2, прыжок 4, клюёт 3, взлёт 4, полёт 4.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 6 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 16x16 pixels, side view: Great tit, slightly larger and more detailed.
```

#### `SPARROW-M1` — Воробей

- **Файл:** `assets/source/animals/sparrow/sparrow_m1.png` · **задача:** W2-13
- **Размер:** 24×24; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 3 ряд(ов) × 3 колонок; ряды = состояния: прыжок 3, клюёт 3, взлёт 3; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Воробей. Состояния: прыжок 3, клюёт 3, взлёт 3.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 3 rows (one row per animation state, left to right frames) and 3 columns, each cell exactly 8x8 pixels, side view: House sparrow: brown streaked back, grey crown, pale belly.
```

#### `GULL-M1` — Чайка

- **Файл:** `assets/source/animals/gull/gull_m1.png` · **задача:** W2-13
- **Размер:** 64×16; кадр 16×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 2 ряд(ов) × 4 колонок; ряды = состояния: парение 4 (6/с), взмахи 4 (8/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Чайка. Состояния: парение 4 (6/с), взмахи 4 (8/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 2 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 16x8 pixels, side view: Herring gull in flight: white body, grey wings with dark tips.
```

#### `MALLARD-M1` — Кряква (пара на воде)

- **Файл:** `assets/source/animals/mallard/mallard_m1.png` · **задача:** W2-13
- **Размер:** 72×16; кадр 12×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 2 ряд(ов) × 6 колонок; ряды = состояния: плывёт 4 (4/с), ныряет 6 (8/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Кряква (пара на воде). Состояния: плывёт 4 (4/с), ныряет 6 (8/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 2 rows (one row per animation state, left to right frames) and 6 columns, each cell exactly 12x8 pixels, side view: Mallard drake on water: green head, white collar, brown chest, side view, with a waterline.
```

#### `SQUIRREL-M1` — Белка (двор)

- **Файл:** `assets/source/animals/squirrel/squirrel_m1.png` · **задача:** W2-13
- **Размер:** 72×24; кадр 12×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 3 ряд(ов) × 6 колонок; ряды = состояния: бег 6 (12/с), сидит 4 (4/с), прячет орех 6 (8/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Белка (двор). Состояния: бег 6 (12/с), сидит 4 (4/с), прячет орех 6 (8/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 3 rows (one row per animation state, left to right frames) and 6 columns, each cell exactly 12x8 pixels, side view: Red squirrel with a bushy tail and ear tufts.
```

#### `SQUIRREL-M2` — Белка (крупно)

- **Файл:** `assets/source/animals/squirrel/squirrel_m2.png` · **задача:** W2-13
- **Размер:** 192×72; кадр 32×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 3 ряд(ов) × 6 колонок; ряды = состояния: бег 6, сидит 4, прячет орех 6; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Белка (крупно). Состояния: бег 6, сидит 4, прячет орех 6.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 3 rows (one row per animation state, left to right frames) and 6 columns, each cell exactly 32x24 pixels, side view: Red squirrel with a bushy tail and ear tufts, more detail.
```

#### `CAT-M1` — Кот Барограф (двор)

- **Файл:** `assets/source/animals/cat/cat_m1.png` · **задача:** W2-13
- **Размер:** 72×48; кадр 12×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 6 ряд(ов) × 6 колонок; ряды = состояния: сон 4 (2/с), поднимает голову 3, потягивается 6 (8/с), умывается 6 (6/с), идёт 6 (8/с), хвост 3 (4/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Кот Барограф (двор). Состояния: сон 4 (2/с), поднимает голову 3, потягивается 6 (8/с), умывается 6 (6/с), идёт 6 (8/с), хвост 3 (4/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 6 rows (one row per animation state, left to right frames) and 6 columns, each cell exactly 12x8 pixels, side view: Grey tabby cat with a white chest and white paws, chunky and calm.
```

#### `CAT-M2` — Кот Барограф (на телетайпе)

- **Файл:** `assets/source/animals/cat/cat_m2.png` · **задача:** W2-13
- **Размер:** 192×120; кадр 32×20 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 6 ряд(ов) × 6 колонок; ряды = состояния: сон 4, поднимает голову 3, потягивается 6, умывается 6, идёт 6, хвост 3; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Кот Барограф (на телетайпе). Состояния: сон 4, поднимает голову 3, потягивается 6, умывается 6, идёт 6, хвост 3.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 6 rows (one row per animation state, left to right frames) and 6 columns, each cell exactly 32x20 pixels, side view: Grey tabby cat with a white chest and white paws, detailed, lying on top of a machine in the sleep frames.
```

#### `PIGEON-M1` — Голубь

- **Файл:** `assets/source/animals/pigeon/pigeon_m1.png` · **задача:** W2-13
- **Размер:** 32×24; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 3 ряд(ов) × 4 колонок; ряды = состояния: сидит 2, взлёт 4, полёт 4; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Голубь. Состояния: сидит 2, взлёт 4, полёт 4.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 3 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 8x8 pixels, side view: Rock pigeon: blue-grey body, iridescent neck hint, dark wing bars.
```

#### `BULLFINCH-M1` — Снегирь (зима)

- **Файл:** `assets/source/animals/bullfinch/bullfinch_m1.png` · **задача:** W2-13
- **Размер:** 32×24; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 3 ряд(ов) × 4 колонок; ряды = состояния: покой 4, прыжок 4, полёт 4; пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Снегирь (зима). Состояния: покой 4, прыжок 4, полёт 4.
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 3 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 8x8 pixels, side view: Eurasian bullfinch male: rose-red breast, black cap, grey back.
```

#### `FLOCK-FAR` — Дальняя стая

- **Файл:** `assets/source/animals/flock/flock_far.png` · **задача:** W2-13
- **Размер:** 64×8; кадр 16×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** stone, birch_snow, facade, foliage, window, night
- **Раскладка листа:** 1 ряд(ов) × 4 колонок; ряды = состояния: полёт стаи 4 (8/с); пустые ячейки прозрачны
- **Точка опоры:** лапы/низ тела по центру кадра, одинаковый во всех кадрах
- **Содержание:** Дальняя стая. Состояния: полёт стаи 4 (8/с).
- **После генерации:** Анимационные листы по правилам проекта доводятся вручную: одинаковая точка опоры, без дрожания контура, без промежуточных размытых кадров.

```text
Pixel art animation sprite sheet on transparent background, 1 rows (one row per animation state, left to right frames) and 4 columns, each cell exactly 16x8 pixels, side view: Group of five tiny distant bird silhouettes, 2-3 px each, in a loose V.
```

### Эффекты

#### `FX-RIPPLE` — Круги на воде

- **Файл:** `assets/source/effects/fx_ripple.png` · **задача:** W2-19
- **Размер:** 36×4; кадр 12×4 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** water
- **Раскладка листа:** 1 ряд × 3
- **Точка опоры:** центр

```text
Three frames of a small expanding water ripple ellipse seen from low angle.
```

### Персонажи

#### `MENTOR-PORTRAIT` — Вера Павловна Ладожская: портрет

- **Файл:** `assets/source/characters/npc/mentor_portrait.png` · **задача:** W2-14
- **Размер:** 384×192; кадр 64×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 24
- **Рампы:** people, ui_teal, birch_snow, ink
- **Раскладка листа:** ряд 1: 6 выражений (нейтрально, улыбка, задумчивость, удивление, одобрение, строгость); ряд 2: кивок 4 кадра; ряд 3: очки на лоб 3 кадра
- **Точка опоры:** низ по центру (плечи)
- **Содержание:** Женщина 55–60 лет, ведущий синоптик: седые волосы (#9A9AA4) в аккуратном пучке, очки в тонкой оправе, тёмно-бирюзовый кардиган поверх светлой блузки, спокойное умное лицо, лёгкая улыбка. Голова и плечи, вид 3/4 вправо.
- **Нельзя:** Не карикатура, не военная форма, без бейджей с надписями.

```text
Character portrait sheet, head and shoulders, 3/4 view facing right: a kind, intelligent senior woman meteorologist in her late fifties, grey hair in a neat bun, thin-rimmed glasses, dark teal cardigan over a light blouse. Row 1: six expressions (neutral, smile, thoughtful, surprised, approving, stern). Row 2: four frames of a nod. Row 3: three frames of pushing glasses up onto the forehead. Consistent face across all frames.
```

#### `MENTOR-M1` — Наставник: фигура в хабе

- **Файл:** `assets/source/characters/npc/mentor_m1.png` · **задача:** W2-14
- **Размер:** 72×48; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** people, ui_teal, stone
- **Раскладка листа:** ряд 1: стоит 4 кадра; ряд 2: идёт вбок 6 кадров (вправо, влево — отражением)
- **Точка опоры:** между ступнями

```text
Tiny 12x24 walking sprite of the same senior woman meteorologist (grey bun, teal cardigan), side view.
```

#### `TECH-M1` — Семён, техник метеоплощадки

- **Файл:** `assets/source/characters/npc/tech_semyon_m1.png` · **задача:** W2-14
- **Размер:** 72×72; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** people, ui_teal, stone, state
- **Раскладка листа:** ряд 1: идёт 6; ряд 2: открывает будку 6; ряд 3: записывает в журнал 6
- **Точка опоры:** между ступнями
- **Содержание:** Мужчина 30 лет, оранжевая рабочая куртка поверх серого, вязаная шапка, планшет-журнал в руке.

```text
Tiny 12x24 sprite of a young male weather technician in an orange work jacket and knitted hat holding a logbook. Row 1 walk cycle, row 2 opening an instrument shelter, row 3 writing in the logbook. Side view.
```

#### `LAB-M1` — Лаборантка с папкой

- **Файл:** `assets/source/characters/npc/lab_assistant_m1.png` · **задача:** W2-14
- **Размер:** 72×48; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** people, birch_snow, facade
- **Раскладка листа:** ряд 1: идёт 6; ряд 2: роняет лист 4
- **Точка опоры:** между ступнями
- **Содержание:** Молодая женщина в белом халате с синей папкой, тёмный хвост волос.

```text
Tiny 12x24 sprite of a young female lab assistant in a white lab coat carrying a blue folder, dark ponytail. Row 1 walk cycle, row 2 dropping a sheet of paper. Side view.
```

#### `AVATAR-BASE-M1` — Аватар: база (двор)

- **Файл:** `assets/source/characters/avatar/avatar_base_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** people, stone
- **Раскладка листа:** ряд 1: идёт вниз 6; ряд 2: идёт вверх 6; ряд 3: идёт вбок 6; ряд 4: стоит вбок 4
- **Точка опоры:** между ступнями
- **Содержание:** Нейтральное тело стажёра в базовой серой футболке и тёмных брюках; кожа строго #F2C9A8/#D9A07E, волосы #2B211C — они заменяются кодом на выбранные тона. Голова 6 px, без сложных деталей.
- **После генерации:** Слои одежды CLOTH-*-M1 рисуются по этой же сетке и точке опоры.

```text
Tiny 12x24 neutral base character for a modular avatar system: plain grey t-shirt, dark trousers, short dark hair, four-direction walk sheet (down, up, side) plus side idle. Clean readable silhouette.
```

#### `AVATAR-BASE-M2` — Аватар: база (комната)

- **Файл:** `assets/source/characters/avatar/avatar_base_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 14
- **Рампы:** people, stone
- **Раскладка листа:** ряд 1: стоит анфас 4; ряд 2: идёт вбок 6; ряд 3: работает за телетайпом сидя, вид сбоку вправо 6; ряд 4: думает 4; ряд 5: радуется сидя 6; ряд 6: ошибся 4
- **Точка опоры:** между ступнями (сидя — центр сиденья)
- **Содержание:** То же нейтральное тело в масштабе 32×48. Сидячие ряды — без стула (стул рисуется в комнате).

```text
32x48 neutral base character sprite sheet for a modular avatar: plain grey t-shirt, dark trousers, short dark hair. Rows: front idle (4), side walk (6), seated typing at a machine seen from the side facing right (6), thinking with hand on chin (4), small seated celebration (6), small seated disappointment (4).
```

#### `SCR-WARDROBE-BG` — Склад формы (фон S04)

- **Файл:** `assets/source/environment/rooms/wardrobe/wardrobe_bg.png` · **задача:** W2-15
- **Размер:** 480×270 · **фон:** непрозрачный · **цветов не больше:** 40
- **Рампы:** facade, ui_teal, stone, window, paper
- **Содержание:** Тёплая комната выдачи формы: слева круглый подиум с местом под персонажа, справа стеллажи с полками-ячейками (пустыми), вешалки, зеркало, лампа.

```text
Cozy uniform storeroom at a weather station: a round low podium on the left, wooden shelving with empty cubbies on the right, coat rails, a standing mirror, a warm ceiling lamp. No people.
```

### Слои одежды аватара

#### `CLOTH-top.center-jacket-M1` — Одежда top.center-jacket (M1)

- **Файл:** `assets/source/characters/avatar/clothes/top_center-jacket_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: куртка центра: тёмно-бирюзовая с янтарной окантовкой. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (dark teal staff jacket with amber piping) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.center-jacket-M2` — Одежда top.center-jacket (M2)

- **Файл:** `assets/source/characters/avatar/clothes/top_center-jacket_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: куртка центра: тёмно-бирюзовая с янтарной окантовкой. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (dark teal staff jacket with amber piping) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.hoodie-M1` — Одежда top.hoodie (M1)

- **Файл:** `assets/source/characters/avatar/clothes/top_hoodie_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: толстовка с капюшоном, серо-синяя. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (grey-blue hoodie) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.hoodie-M2` — Одежда top.hoodie (M2)

- **Файл:** `assets/source/characters/avatar/clothes/top_hoodie_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: толстовка с капюшоном, серо-синяя. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (grey-blue hoodie) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.shirt-M1` — Одежда top.shirt (M1)

- **Файл:** `assets/source/characters/avatar/clothes/top_shirt_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: светлая рубашка с коротким рукавом. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (light short-sleeve shirt) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.shirt-M2` — Одежда top.shirt (M2)

- **Файл:** `assets/source/characters/avatar/clothes/top_shirt_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: светлая рубашка с коротким рукавом. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (light short-sleeve shirt) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.field-jacket-M1` — Одежда top.field-jacket (M1)

- **Файл:** `assets/source/characters/avatar/clothes/top_field-jacket_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: полевая куртка оливковая с карманами. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (olive field jacket with pockets) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.field-jacket-M2` — Одежда top.field-jacket (M2)

- **Файл:** `assets/source/characters/avatar/clothes/top_field-jacket_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: полевая куртка оливковая с карманами. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (olive field jacket with pockets) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.sweater-M1` — Одежда top.sweater (M1)

- **Файл:** `assets/source/characters/avatar/clothes/top_sweater_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: вязаный свитер охристый. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (ochre knitted sweater) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-top.sweater-M2` — Одежда top.sweater (M2)

- **Файл:** `assets/source/characters/avatar/clothes/top_sweater_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: вязаный свитер охристый. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (ochre knitted sweater) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.dark-trousers-M1` — Одежда bottom.dark-trousers (M1)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_dark-trousers_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: тёмные брюки. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (dark trousers) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.dark-trousers-M2` — Одежда bottom.dark-trousers (M2)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_dark-trousers_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: тёмные брюки. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (dark trousers) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.field-trousers-M1` — Одежда bottom.field-trousers (M1)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_field-trousers_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: полевые брюки с наколенниками. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (field trousers with knee pads) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.field-trousers-M2` — Одежда bottom.field-trousers (M2)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_field-trousers_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: полевые брюки с наколенниками. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (field trousers with knee pads) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.jeans-M1` — Одежда bottom.jeans (M1)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_jeans_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: синие джинсы. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (blue jeans) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-bottom.jeans-M2` — Одежда bottom.jeans (M2)

- **Файл:** `assets/source/characters/avatar/clothes/bottom_jeans_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: синие джинсы. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (blue jeans) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.sneakers-M1` — Одежда footwear.sneakers (M1)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_sneakers_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: кеды светлые. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (light sneakers) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.sneakers-M2` — Одежда footwear.sneakers (M2)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_sneakers_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: кеды светлые. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (light sneakers) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.boots-M1` — Одежда footwear.boots (M1)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_boots_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: походные ботинки. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (hiking boots) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.boots-M2` — Одежда footwear.boots (M2)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_boots_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: походные ботинки. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (hiking boots) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.shoes-M1` — Одежда footwear.shoes (M1)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_shoes_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: закрытые туфли. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (plain shoes) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-footwear.shoes-M2` — Одежда footwear.shoes (M2)

- **Файл:** `assets/source/characters/avatar/clothes/footwear_shoes_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: закрытые туфли. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (plain shoes) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.cap-M1` — Одежда headwear.cap (M1)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_cap_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: кепка. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (cap) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.cap-M2` — Одежда headwear.cap (M2)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_cap_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: кепка. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (cap) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.beanie-M1` — Одежда headwear.beanie (M1)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_beanie_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: вязаная шапка. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (beanie) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.beanie-M2` — Одежда headwear.beanie (M2)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_beanie_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: вязаная шапка. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (beanie) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.scarf-M1` — Одежда headwear.scarf (M1)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_scarf_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: шарф. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (scarf) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.scarf-M2` — Одежда headwear.scarf (M2)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_scarf_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: шарф. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (scarf) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.goggles-M1` — Одежда headwear.goggles (M1)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_goggles_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: защитные очки на лоб. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (goggles on forehead) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-headwear.goggles-M2` — Одежда headwear.goggles (M2)

- **Файл:** `assets/source/characters/avatar/clothes/headwear_goggles_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: защитные очки на лоб. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (goggles on forehead) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.pencil-M1` — Одежда held.pencil (M1)

- **Файл:** `assets/source/characters/avatar/clothes/held_pencil_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: карандаш в руке. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (pencil in hand) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.pencil-M2` — Одежда held.pencil (M2)

- **Файл:** `assets/source/characters/avatar/clothes/held_pencil_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: карандаш в руке. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (pencil in hand) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.tablet-M1` — Одежда held.tablet (M1)

- **Файл:** `assets/source/characters/avatar/clothes/held_tablet_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: планшет в руке. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (tablet in hand) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.tablet-M2` — Одежда held.tablet (M2)

- **Файл:** `assets/source/characters/avatar/clothes/held_tablet_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: планшет в руке. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (tablet in hand) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.map-folder-M1` — Одежда held.map-folder (M1)

- **Файл:** `assets/source/characters/avatar/clothes/held_map-folder_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: папка карт под мышкой. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (map folder under arm) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-held.map-folder-M2` — Одежда held.map-folder (M2)

- **Файл:** `assets/source/characters/avatar/clothes/held_map-folder_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: папка карт под мышкой. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (map folder under arm) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-backpack.field-M1` — Одежда backpack.field (M1)

- **Файл:** `assets/source/characters/avatar/clothes/backpack_field_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: полевой рюкзак. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (field backpack) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-backpack.field-M2` — Одежда backpack.field (M2)

- **Файл:** `assets/source/characters/avatar/clothes/backpack_field_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: полевой рюкзак. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (field backpack) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-backpack.city-M1` — Одежда backpack.city (M1)

- **Файл:** `assets/source/characters/avatar/clothes/backpack_city_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: городской рюкзак. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (city backpack) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-backpack.city-M2` — Одежда backpack.city (M2)

- **Файл:** `assets/source/characters/avatar/clothes/backpack_city_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: городской рюкзак. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (city backpack) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-badge.meteo-M1` — Одежда badge.meteo (M1)

- **Файл:** `assets/source/characters/avatar/clothes/badge_meteo_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: значок метеоролога на груди. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (small meteorologist pin badge) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-badge.meteo-M2` — Одежда badge.meteo (M2)

- **Файл:** `assets/source/characters/avatar/clothes/badge_meteo_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: значок метеоролога на груди. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (small meteorologist pin badge) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-badge.aerology-M1` — Одежда badge.aerology (M1)

- **Файл:** `assets/source/characters/avatar/clothes/badge_aerology_m1.png` · **задача:** W2-15
- **Размер:** 72×96; кадр 12×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M1
- **Точка опоры:** как у AVATAR-BASE-M1
- **Содержание:** Только предмет: значок аэролога на груди. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (small aerology pin badge) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

#### `CLOTH-badge.aerology-M2` — Одежда badge.aerology (M2)

- **Файл:** `assets/source/characters/avatar/clothes/badge_aerology_m2.png` · **задача:** W2-15
- **Размер:** 192×288; кадр 32×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, facade, stone, foliage, state, birch_snow
- **Раскладка листа:** Точно та же сетка рядов и кадров, что AVATAR-BASE-M2
- **Точка опоры:** как у AVATAR-BASE-M2
- **Содержание:** Только предмет: значок аэролога на груди. Всё, что не предмет, прозрачно; предмет повторяет позу каждого кадра базы.
- **После генерации:** Генерация здесь — только черновик силуэта; совмещение по кадрам выполняется вручную поверх базы.

```text
Clothing overlay layer only (small aerology pin badge) drawn exactly on top of every frame of the base avatar sheet, same grid, transparent everywhere else.
```

### Интерфейсный набор v2

#### `UI-PANEL-DARK` — Панель тёмная

- **Файл:** `assets/source/ui/v3/ui_panel_dark.png` · **задача:** W2-16
- **Размер:** 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** ui_teal
- **Раскладка листа:** 9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся
- **Содержание:** Фон #0C2A33, рамка 2 px: внешняя #143F4C, внутренний блик сверху-слева #367C8B, тень снизу-справа #0C2A33.

```text
Flat dark-teal UI panel tile with a crisp 2-pixel bevelled border, for 9-slice scaling.
```

#### `UI-PANEL-RAISED` — Панель приподнятая

- **Файл:** `assets/source/ui/v3/ui_panel_raised.png` · **задача:** W2-16
- **Размер:** 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** ui_teal
- **Раскладка листа:** 9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся
- **Содержание:** Фон #1B5660, светлая фаска #6F9E95.

```text
Raised teal UI panel tile, 2-pixel bevel, 9-slice.
```

#### `UI-DIALOG` — Окно диалога с уголками

- **Файл:** `assets/source/ui/v3/ui_dialog.png` · **задача:** W2-16
- **Размер:** 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 7
- **Рампы:** ui_teal, accent
- **Раскладка листа:** 9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся
- **Содержание:** Как UI-PANEL-DARK + янтарные уголки-скобки 5×5 #F2C75C в каждом углу.

```text
Dark teal dialog frame tile with small amber corner brackets, 9-slice.
```

#### `UI-PAPER-SHEET` — Бумажный бланк

- **Файл:** `assets/source/ui/v3/ui_paper_sheet.png` · **задача:** W2-16
- **Размер:** 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ink
- **Раскладка листа:** 9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся
- **Содержание:** Кремовая бумага #E2D6B6, верхняя кромка #F3ECD8, тень снизу 1 px #BFAF8A, редкие волокна.

```text
Cream paper sheet tile with a subtle 1-pixel bottom shadow, clean, 9-slice.
```

#### `UI-PAPER-PERF` — Бланк с перфорацией

- **Файл:** `assets/source/ui/v3/ui_paper_perf.png` · **задача:** W2-16
- **Размер:** 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ink
- **Раскладка листа:** 9-slice: углы 6×6 px не растягиваются, середины сторон и центр тайлятся; перфорация — по верхней кромке

```text
Cream paper tile with a perforated tear-off top edge, 9-slice.
```

#### `UI-CLIPBOARD` — Планшет с зажимом

- **Файл:** `assets/source/ui/v3/ui_clipboard.png` · **задача:** W2-16
- **Размер:** 160×220 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** facade, stone, paper
- **Содержание:** Деревянная доска, металлический зажим сверху, лист бумаги под ним (пустой).

```text
Wooden clipboard with a metal clip at the top holding a blank cream sheet, front view.
```

#### `UI-TAPE` — Лента телеграммы (тайл)

- **Файл:** `assets/source/ui/v3/ui_tape.png` · **задача:** W2-16
- **Размер:** 32×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ink
- **Раскладка листа:** Бесшовный тайл по горизонтали; ряд круглых отверстий 2×2 сверху и снизу с шагом 8 px

```text
Seamless horizontal tile of a cream teletype paper tape with a row of small punched holes along both edges.
```

#### `UI-TAPE-END` — Оторванный конец ленты

- **Файл:** `assets/source/ui/v3/ui_tape_end.png` · **задача:** W2-16
- **Размер:** 16×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ink

```text
Torn ragged end of a cream paper tape, matching the tape tile.
```

#### `UI-BTN-PRIMARY` — Кнопка главная

- **Файл:** `assets/source/ui/v3/ui_btn_primary.png` · **задача:** W2-16
- **Размер:** 48×96; кадр 48×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** accent, ui_teal, stone
- **Раскладка листа:** 6 рядов: покой, наведение (+1 px подъём, светлее), нажатие (−1 px, фаска инвертирована), фокус (рамка #F0D476 2 px), недоступна (серая #3C4857), загрузка (3 точки)
- **Содержание:** янтарная #F2C75C, блик #FFDD83, тень #B88626, текст будет тёмным. Горизонтальный 9-slice: торцы 6 px. Без текста.

```text
Pixel UI button without text, янтарная #F2C75C, six states stacked vertically: idle, hover, pressed, keyboard focus, disabled, loading.
```

#### `UI-BTN-SECONDARY` — Кнопка вторичная

- **Файл:** `assets/source/ui/v3/ui_btn_secondary.png` · **задача:** W2-16
- **Размер:** 48×96; кадр 48×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, ui_teal, stone
- **Раскладка листа:** 6 рядов: покой, наведение (+1 px подъём, светлее), нажатие (−1 px, фаска инвертирована), фокус (рамка #F0D476 2 px), недоступна (серая #3C4857), загрузка (3 точки)
- **Содержание:** бирюзовая #1B5660, блик #367C8B, тень #0C2A33. Горизонтальный 9-slice: торцы 6 px. Без текста.

```text
Pixel UI button without text, бирюзовая #1B5660, six states stacked vertically: idle, hover, pressed, keyboard focus, disabled, loading.
```

#### `UI-BTN-GHOST` — Кнопка-призрак

- **Файл:** `assets/source/ui/v3/ui_btn_ghost.png` · **задача:** W2-16
- **Размер:** 48×96; кадр 48×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, ui_teal, stone
- **Раскладка листа:** 6 рядов: покой, наведение (+1 px подъём, светлее), нажатие (−1 px, фаска инвертирована), фокус (рамка #F0D476 2 px), недоступна (серая #3C4857), загрузка (3 точки)
- **Содержание:** без заливки, только рамка #367C8B. Горизонтальный 9-slice: торцы 6 px. Без текста.

```text
Pixel UI button without text, без заливки, six states stacked vertically: idle, hover, pressed, keyboard focus, disabled, loading.
```

#### `UI-KEY` — Клавиша клавиатуры телетайпа

- **Файл:** `assets/source/ui/v3/ui_key.png` · **задача:** W2-16
- **Размер:** 80×16; кадр 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** ui_teal, paper, accent
- **Раскладка листа:** 1 ряд × 5: покой, наведение, нажата, фокус, недоступна
- **Содержание:** Кремовая клавиша с тёмной фаской, без символа (символ кладёт интерфейс шрифтом).

```text
Blank cream keyboard key cap, five states: idle, hover, pressed, focus, disabled.
```

#### `UI-CHOICE-CARD` — Карточка выбора

- **Файл:** `assets/source/ui/v3/ui_choice_card.png` · **задача:** W2-16
- **Размер:** 240×48; кадр 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** paper, accent, state, marks
- **Раскладка листа:** 1 ряд × 5 (каждая 9-slice): покой, наведение, выбрана (янтарная рамка), верная (зелёная #5FAF78 + галочка), неверная (красный карандаш #B8423A)

```text
Blank cream answer card tile, five states: idle, hover, selected with amber border, correct with green border and tick, wrong with red pencil cross.
```

#### `UI-LAMP` — Лампа серии

- **Файл:** `assets/source/ui/v3/ui_lamp.png` · **задача:** W2-16
- **Размер:** 21×7; кадр 7×7 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** stone, accent
- **Раскладка листа:** 1 ряд × 3: погашена, горит, вспышка

```text
Tiny round indicator lamp: off, lit amber, flash.
```

#### `UI-STAMP-RECT` — Оттиск штампа (прямоугольный)

- **Файл:** `assets/source/ui/v3/ui_stamp_rect.png` · **задача:** W2-16
- **Размер:** 192×24; кадр 64×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** marks
- **Раскладка листа:** 1 ряд × 3: оттиск слабый, полный, полный с непропечаткой
- **Содержание:** Двойная прямоугольная рамка цвета #2F6E5A с неровной пропечаткой. БЕЗ ТЕКСТА.
- **Нельзя:** Слова «ПРИНЯТО», «ПРОВЕРИТЬ», «ДОПУСК» наносятся вручную шрифтом PixCyrillic 16 px в Aseprite.

```text
Empty rubber-stamp imprint: double rectangular border in dark green ink, uneven inking, no text, three variants.
```

#### `UI-STAMP-ROUND` — Оттиск печати (круглый)

- **Файл:** `assets/source/ui/v3/ui_stamp_round.png` · **задача:** W2-16
- **Размер:** 96×32; кадр 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** marks
- **Раскладка листа:** 1 ряд × 3 варианта
- **Содержание:** Круглая печать с двойным кольцом, без текста; центр пустой.

```text
Empty round ink seal imprint with a double ring, dark green, no text, three variants.
```

#### `UI-BUBBLE` — Пузырь реплики

- **Файл:** `assets/source/ui/v3/ui_bubble.png` · **задача:** W2-16
- **Размер:** 64×32; кадр 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** paper, ink
- **Раскладка листа:** 1 ряд × 2: хвостик слева, хвостик снизу (9-slice)

```text
Cream speech bubble tile with a dark outline, two variants: tail on the left, tail at the bottom.
```

#### `UI-TAB` — Закладка справочника

- **Файл:** `assets/source/ui/v3/ui_tab.png` · **задача:** W2-16
- **Размер:** 48×32; кадр 24×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** facade, ui_teal, paper
- **Раскладка листа:** 1 ряд × 2: неактивная, активная

```text
Book bookmark tab sticking out of a page, two states: inactive (muted), active (brighter, longer).
```

#### `UI-PORTRAIT-FRAME` — Рамка портрета

- **Файл:** `assets/source/ui/v3/ui_portrait_frame.png` · **задача:** W2-16
- **Размер:** 72×72 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** ui_teal, accent
- **Содержание:** Рамка 4 px вокруг окна 64×64, центр прозрачный.

```text
Square dark-teal portrait frame with a thin amber inner line, transparent centre.
```

#### `UI-PASSEPARTOUT` — Паспарту (тайл)

- **Файл:** `assets/source/ui/v3/ui_passepartout.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** непрозрачный · **цветов не больше:** 3
- **Рампы:** ui_teal
- **Содержание:** Тёмная бирюзовая ткань с пиксельной строчкой, бесшовный тайл.

```text
Seamless 16x16 tile of dark teal fabric with a subtle stitched pixel pattern.
```

#### `UI-PERF-DOT` — Перфорация прогресса

- **Файл:** `assets/source/ui/v3/ui_perf_dot.png` · **задача:** W2-16
- **Размер:** 16×8; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 4
- **Рампы:** paper, accent
- **Раскладка листа:** 1 ряд × 2: пустая, заполненная

```text
Punched hole: empty and filled amber.
```

#### `UI-BOOK-SPREAD` — Справочник: разворот

- **Файл:** `assets/source/ui/v3/ui_book_spread.png` · **задача:** W2-16
- **Размер:** 400×240 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 16
- **Рампы:** facade, paper, ink
- **Содержание:** Раскрытая книга в тканевом переплёте, две пустые страницы, корешок по центру.

```text
Open hardcover reference book seen from above, cloth binding, two blank cream pages, centre spine shadow.
```

#### `UI-BOOK-STRAP` — Справочник закрыт на ремешок

- **Файл:** `assets/source/ui/v3/ui_book_strap.png` · **задача:** W2-16
- **Размер:** 200×240 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** facade, stone

```text
Closed hardcover book fastened with a leather strap and buckle, front view, no title.
```

#### `UI-JOURNAL-SPREAD` — Журнал допуска: разворот

- **Файл:** `assets/source/ui/v3/ui_journal_spread.png` · **задача:** W2-16
- **Размер:** 400×240 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 16
- **Рампы:** ui_teal, paper, ink
- **Содержание:** Разлинованный журнал в тёмно-бирюзовой обложке, пустые страницы.

```text
Open ruled logbook with a dark teal cover seen from above, two blank lined pages.
```

#### `UI-INDEX-TAB` — Указатель группы в журнале

- **Файл:** `assets/source/ui/v3/ui_index_tab.png` · **задача:** W2-16
- **Размер:** 96×16; кадр 32×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** paper, accent, ui_teal
- **Раскладка листа:** 1 ряд × 3: покой, наведение, выбран

```text
Paper index tab on a logbook edge, three states.
```

#### `UI-USER-CARD` — Карточка участника

- **Файл:** `assets/source/ui/v3/ui_user_card.png` · **задача:** W2-16
- **Размер:** 144×48; кадр 48×48 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, accent, state
- **Раскладка листа:** 1 ряд × 3 (9-slice): покой, выбран, допущен

```text
Small cream name card tile, three states: idle, selected with amber border, admitted with a green stamp corner.
```

#### `UI-LEVEL-NODE` — Узел карты уровня

- **Файл:** `assets/source/ui/v3/ui_level_node.png` · **задача:** W2-16
- **Размер:** 96×24; кадр 24×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** stone, accent, marks
- **Раскладка листа:** 1 ряд × 4: закрыт, доступен, пройден, пройден идеально

```text
Round tape-map node, four states: grey locked, amber available, green stamped done, gold stamped perfect.
```

#### `UI-TORN-TAPE` — Оборванная лента (ошибки связи)

- **Файл:** `assets/source/ui/v3/ui_torn_tape.png` · **задача:** W2-16
- **Размер:** 160×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, ink, ui_teal

```text
Illustration of a teletype paper tape torn in two, ends curling, on dark background transparent.
```

#### `UI-CERTIFICATE-PAPER` — Бланк свидетельства

- **Файл:** `assets/source/ui/v3/ui_certificate_paper.png` · **задача:** W2-16
- **Размер:** 320×220 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 14
- **Рампы:** paper, facade, accent, ink
- **Содержание:** Пергаментный лист с орнаментальной рамкой из стилизованных изобар и облаков, пустые поля под текст, место под круглую печать справа внизу.
- **Нельзя:** Без текста, гербов и символики реальных организаций.

```text
Blank parchment certificate sheet with an ornamental border of stylised wavy lines and small clouds, empty text area, empty circle space at lower right for a seal, no text, no emblems.
```

#### `UI-ENVELOPE` — Конверт награды

- **Файл:** `assets/source/ui/v3/ui_envelope.png` · **задача:** W2-16
- **Размер:** 144×32; кадр 48×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, facade, marks
- **Раскладка листа:** 1 ряд × 3: закрыт, клапан открывается, открыт

```text
Small paper envelope with a wax seal, three opening frames.
```

### Иконки 16×16

#### `ICON-JOURNAL` — Иконка: журнал ошибок: тетрадь с закладкой

- **Файл:** `assets/source/ui/v3/icons/icon_journal.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** журнал ошибок: тетрадь с закладкой. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: notebook with a bookmark, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-DISCOVERIES` — Иконка: находки: бинокль

- **Файл:** `assets/source/ui/v3/icons/icon_discoveries.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** находки: бинокль. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: binoculars, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-PERSON` — Иконка: персонаж: силуэт головы и плеч

- **Файл:** `assets/source/ui/v3/icons/icon_person.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** персонаж: силуэт головы и плеч. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: person head and shoulders, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-GEAR` — Иконка: настройки: шестерня

- **Файл:** `assets/source/ui/v3/icons/icon_gear.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** настройки: шестерня. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: gear, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-SOUND-ON` — Иконка: звук включён: динамик с волнами

- **Файл:** `assets/source/ui/v3/icons/icon_sound-on.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** звук включён: динамик с волнами. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: speaker with waves, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-SOUND-OFF` — Иконка: звук выключен: динамик с косой чертой

- **Файл:** `assets/source/ui/v3/icons/icon_sound-off.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** звук выключен: динамик с косой чертой. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: muted speaker, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-MOON` — Иконка: ночь

- **Файл:** `assets/source/ui/v3/icons/icon_moon.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** ночь. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: crescent moon, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-SUN` — Иконка: день

- **Файл:** `assets/source/ui/v3/icons/icon_sun.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** день. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: sun, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-DAWN` — Иконка: рассвет: половина солнца над линией

- **Файл:** `assets/source/ui/v3/icons/icon_dawn.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** рассвет: половина солнца над линией. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: half sun on horizon, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-LOCK` — Иконка: закрыто: замок

- **Файл:** `assets/source/ui/v3/icons/icon_lock.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** закрыто: замок. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: padlock closed, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-UNLOCK` — Иконка: открыто: замок открыт

- **Файл:** `assets/source/ui/v3/icons/icon_unlock.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** открыто: замок открыт. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: padlock open, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-PAUSE` — Иконка: пауза

- **Файл:** `assets/source/ui/v3/icons/icon_pause.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** пауза. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: pause bars, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-BOOK` — Иконка: справочник: книга

- **Файл:** `assets/source/ui/v3/icons/icon_book.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** справочник: книга. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: closed book, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-CHECK` — Иконка: верно: галочка

- **Файл:** `assets/source/ui/v3/icons/icon_check.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** верно: галочка. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: check mark, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-CROSS` — Иконка: неверно: крестик карандашом

- **Файл:** `assets/source/ui/v3/icons/icon_cross.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** неверно: крестик карандашом. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: pencil cross, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-ARROW-LEFT` — Иконка: назад

- **Файл:** `assets/source/ui/v3/icons/icon_arrow-left.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** назад. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: arrow left, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-ARROW-RIGHT` — Иконка: вперёд

- **Файл:** `assets/source/ui/v3/icons/icon_arrow-right.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** вперёд. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: arrow right, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-STAR` — Иконка: звезда результата

- **Файл:** `assets/source/ui/v3/icons/icon_star.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** звезда результата. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: star, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-CLOCK` — Иконка: время

- **Файл:** `assets/source/ui/v3/icons/icon_clock.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** время. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: clock, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-TAPE` — Иконка: телеграмма: кусок ленты

- **Файл:** `assets/source/ui/v3/icons/icon_tape.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** телеграмма: кусок ленты. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: piece of paper tape, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-STATION` — Иконка: станция: кружок станции

- **Файл:** `assets/source/ui/v3/icons/icon_station.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** станция: кружок станции. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: small circle with a dot (weather station marker), light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-THERMOMETER` — Иконка: температура

- **Файл:** `assets/source/ui/v3/icons/icon_thermometer.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** температура. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: thermometer, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-BAROMETER` — Иконка: давление: стрелочный барометр

- **Файл:** `assets/source/ui/v3/icons/icon_barometer.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** давление: стрелочный барометр. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: aneroid barometer dial, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-VANE` — Иконка: ветер: флюгер

- **Файл:** `assets/source/ui/v3/icons/icon_vane.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** ветер: флюгер. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: weather vane, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-CLOUD` — Иконка: облачность

- **Файл:** `assets/source/ui/v3/icons/icon_cloud.png` · **задача:** W2-16
- **Размер:** 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 5
- **Рампы:** paper, ui_teal, accent, ink, marks
- **Содержание:** облачность. Линия 1–2 px, светлая #F3ECD8 с тенью #367C8B, читается на тёмно-бирюзовом фоне.

```text
Single 16x16 pixel icon: cloud, light cream line art with one shade, readable on dark teal, transparent background.
```

#### `ICON-MODE-MENTOR` — Иконка режима: режим «С наставником»: две фигуры у стола

- **Файл:** `assets/source/ui/v3/icons/icon_mode_mentor_32.png` · **задача:** W2-16
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, ui_teal, accent, people

```text
Single 32x32 pixel icon: two figures at a desk, cream and teal with one amber accent, transparent background.
```

#### `ICON-MODE-SOLO` — Иконка режима: режим «Самостоятельно»: одна фигура с карандашом

- **Файл:** `assets/source/ui/v3/icons/icon_mode_solo_32.png` · **задача:** W2-16
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, ui_teal, accent, people

```text
Single 32x32 pixel icon: one figure with a pencil, cream and teal with one amber accent, transparent background.
```

#### `ICON-MODE-BLITZ` — Иконка режима: режим «Блиц»: секундомер

- **Файл:** `assets/source/ui/v3/icons/icon_mode_blitz_32.png` · **задача:** W2-16
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** paper, ui_teal, accent, people

```text
Single 32x32 pixel icon: stopwatch, cream and teal with one amber accent, transparent background.
```

### Бренд и титульный экран

#### `BRAND-MARK-26063` — Знак «26063»

- **Файл:** `assets/source/ui/brand/brand_mark_26063.png` · **задача:** W2-17
- **Размер:** 96×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** accent, ui_teal, stone
- **Содержание:** Табличка-шильдик 96×32 с пятью цифрами 2-6-0-6-3, каждая 14×20 px, моноширинный трафаретный рисунок как у инвентарного номера; цифры #F2C75C с тенью #B88626 на тёмной табличке #0C2A33 с 4 заклёпками.
- **Нельзя:** Не генерировать: цифры рисуются вручную по пиксельной сетке (генеративные надписи запрещены правилами проекта). Генератор — только для идеи таблички.

```text
(Reference only) Small dark teal metal inventory plate with four rivets, space for five large stencil digits.
```

#### `BRAND-EMBLEM-64` — Эмблема станции 64×64

- **Файл:** `assets/source/ui/brand/brand_emblem_64.png` · **задача:** W2-17
- **Размер:** 64×64 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 12
- **Рампы:** ui_teal, accent, water, birch_snow
- **Содержание:** Круглая эмблема: волна залива, силуэт метеомачты с чашечным анемометром, дуга изобары, лавровая веточка; без текста.

```text
Round station emblem badge: stylised bay wave, a weather mast with a cup anemometer, one curved isobar line, a small laurel sprig, teal and amber, no text.
```

#### `BRAND-EMBLEM-32` — Эмблема станции 32×32

- **Файл:** `assets/source/ui/brand/brand_emblem_32.png` · **задача:** W2-17
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, accent, water
- **Содержание:** Та же эмблема, перерисованная под 32 px (не уменьшенная): только волна, мачта и кольцо.
- **После генерации:** Рисовать заново, не уменьшать 64.

```text
Simplified 32x32 version of the same round emblem: wave, mast, ring only.
```

#### `TITLE-MID` — Титул: кампус за водой (средний план)

- **Файл:** `assets/source/ui/brand/title_mid.png` · **задача:** W2-17
- **Размер:** 480×270 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 32
- **Рампы:** night, water, window, facade, stone
- **Место в сцене:** Содержимое y 110–200
- **Содержание:** Силуэты трёх зданий кампуса, радарный купол и мачта на дальнем берегу, отражения окон в воде y 160–200.

```text
Middle layer only: small campus buildings with warm windows and a radar dome across calm water at night, with long window reflections; everything above and below transparent.
```

#### `TITLE-FG` — Титул: набережная (передний план)

- **Файл:** `assets/source/ui/brand/title_fg.png` · **задача:** W2-17
- **Размер:** 480×270 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 24
- **Рампы:** stone, birch_snow, foliage, window, night
- **Место в сцене:** Содержимое y 200–270 и левый край
- **Содержание:** Гранитный парапет набережной с чугунной решёткой, фонарь справа, берёза слева.

```text
Foreground layer only: granite embankment parapet with a cast-iron railing along the bottom, a lamp post on the right, a birch on the left edge; everything else transparent.
```

### Награды уровня

#### `REW-PENCIL-32` — Награда: карандаш стажёра: простой графитовый, обгрызенный кончик

- **Файл:** `assets/source/items/rewards/reward_pencil_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: a simple well-used graphite pencil, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-BADGE-THERMO-32` — Награда: значок «Термометр»: эмалевый круглый с термометром

- **Файл:** `assets/source/items/rewards/reward_badge-thermo_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: round enamel pin with a thermometer, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-BADGE-BARO-32` — Награда: значок «Барометр»: эмалевый с циферблатом барометра

- **Файл:** `assets/source/items/rewards/reward_badge-baro_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: round enamel pin with a barometer dial, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-BADGE-VANE-32` — Награда: значок «Флюгер»: эмалевый с флюгером

- **Файл:** `assets/source/items/rewards/reward_badge-vane_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: round enamel pin with a weather vane, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-LAMP-32` — Награда: лампа дежурного: зелёная настольная

- **Файл:** `assets/source/items/rewards/reward_lamp_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: green-shaded desk lamp, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-TOKEN-32` — Награда: жетон «Кодовый пост»: латунный круглый с волной и лентой; номер наносится вручную

- **Файл:** `assets/source/items/rewards/reward_token_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: round brass token with a wave and tape motif, blank centre, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-CERTIFICATE-32` — Награда: свидетельство: свёрнутый пергамент с печатью

- **Файл:** `assets/source/items/rewards/reward_certificate_32.png` · **задача:** W2-18
- **Размер:** 32×32 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 10
- **Рампы:** accent, facade, paper, ui_teal, stone, marks

```text
Single 32x32 collectible item icon: rolled parchment with a wax seal, slight 3/4 view, soft highlight, transparent background, no text.
```

#### `REW-LAMP-DESK-M2` — Лампа дежурного на столе поста

- **Файл:** `assets/source/items/rewards/reward_lamp_desk_m2.png` · **задача:** W2-18
- **Размер:** 16×24 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 8
- **Рампы:** ui_teal, window, stone
- **Точка опоры:** низ по центру

```text
Small green-shaded desk lamp sprite for a room scene, lit, transparent background.
```

### Эффекты

#### `FX-STAMP-TOOL` — Штамп в руке (удар)

- **Файл:** `assets/source/effects/fx_stamp_tool.png` · **задача:** W2-19
- **Размер:** 48×20; кадр 16×20 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 6
- **Рампы:** facade, stone, marks
- **Раскладка листа:** 1 ряд × 3: замах, удар со сжатием, подъём
- **Частота:** ~16 кадр/с
- **Точка опоры:** низ по центру

```text
Wooden rubber stamp with a round handle, 3 frames: raised, hitting with squash, lifting.
```

#### `FX-PENCIL-CIRCLE` — Обводка красным карандашом

- **Файл:** `assets/source/effects/fx_pencil_circle.png` · **задача:** W2-19
- **Размер:** 96×16; кадр 24×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 2
- **Рампы:** marks
- **Раскладка листа:** 1 ряд × 4: прорисовка эллипса
- **Частота:** 16 кадр/с

```text
Hand-drawn red pencil ellipse being drawn in 4 frames (quarter, half, three quarters, closed with overlap).
```

#### `FX-VALUE-TRAIL` — След перелёта значения

- **Файл:** `assets/source/effects/fx_value_trail.png` · **задача:** W2-19
- **Размер:** 24×8; кадр 8×8 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** accent
- **Раскладка листа:** 1 ряд × 3

```text
Tiny amber sparkle in 3 fading frames.
```

#### `FX-WINDOW-GLOW` — Вспышка загорающегося окна

- **Файл:** `assets/source/effects/fx_window_glow.png` · **задача:** W2-19
- **Размер:** 32×16; кадр 16×16 · **фон:** прозрачный (альфа 0/255) · **цветов не больше:** 3
- **Рампы:** window
- **Раскладка листа:** 1 ряд × 2

```text
Small dithered warm halo around a window, 2 frames.
```

