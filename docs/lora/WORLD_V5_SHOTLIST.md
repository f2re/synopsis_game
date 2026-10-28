# World v5: анти-overfit пакет кадров (сцены 29–58)

Статус: список заданий для генератора. Цель: довести world-датасет с 28 до 54–58 кадров за счёт новых
пространств и ракурсов, а не вариаций вида «главный корпус слева, залив справа». Контекст: `docs/TRAINING_STYLE_V4.md`,
`docs/lora/DATASET_PROMPTS_AND_GAPS.md`.

## Правила пакета

- Один сюжет = одна отдельная генерация. Без коллажей, листов и номеров на кадре; ничего не обрезать после.
- Размер 16:9, 1672×941 или близкий. Имя файла как в таблице (`world_29_station_close_overcast.png`).
- Главный корпус кампуса максимум в 4–5 кадрах из 30.
- Интерьеры 37–38, 43–56 не должны тащить внешний кампус: никакого радара или купола в окне, знакомой башни,
  фасада главного корпуса, панорамы залива с городом из уже обученных кадров. В окнах только нейтральный вид.
- Люди не нужны. Допускаются следы людей: кружка, куртка на стуле, открытая папка, включённая лампа.

## Префикс и суффикс (подставлять в каждый промпт)

Префикс:

```
Pixel art game environment illustration, one single image, aspect ratio 16:9, fine small pixels, clean dark-tinted outlines, smooth painterly colour ramps, dense natural detail, one consistent light source,
```

Суффикс:

```
single independent composition, one image only, no collage, no contact sheet, no scene number, no text, no labels, no UI, no watermark; do not reuse the familiar composition with the main building on the left and the bay on the right; vary camera height, focal distance, viewing direction and foreground occlusion
```

## Сцены

Формат: `файл | сезон, свет, погода | промпт (вставлять между префиксом и суффиксом)`.

### Метеоплощадка и радар (снаружи)

| № | Файл | Свет | Промпт |
| --- | --- | --- | --- |
| 29 | `world_29_station_close_overcast` | лето, день, пасмурно | camera at 1.4 m height between white louvered shelters and instrument stands, looking along a low fence, foreground-heavy, wet grass, grey even light, no buildings |
| 30 | `world_30_station_lowangle_wind` | весна, день, ветер | extremely low camera in the grass looking up at instruments against the sky, a wind mast and a windsock stretched out, flattened grass blades in the foreground, scudding clouds |
| 31 | `world_31_station_night` | осень, ночь, ясно | camera inside the observation field looking outward, instrument shelters in cool moonlight, one lamp post with a warm glow, stars, frost on the grass |
| 32 | `world_32_station_fog_morning` | лето, утро, густой туман | telephoto view along a row of instrument shelters receding into dense fog, compressed depth, wet grass, soft low sun, no buildings |
| 33 | `world_33_radar_from_below_stratus` | осень, день, низкий stratus | camera at the foot of a granite staircase looking steeply up at a white radar dome on a tower, strong low angle, uniform low stratus sky, no main building facade |
| 34 | `world_34_radar_back_rain` | лето, день, дождь | the radar building seen from behind a technical zone, cable trays, a transformer box, wet concrete, rain streaks, grey light, a lattice mast partly in frame |
| 35 | `world_35_radar_base_night` | зима, ночь, ясно | close-medium view of the base of a radar dome, a ring of service lights, part of the tower cut by the frame, snow on the steps, cold blue night |
| 36 | `world_36_service_yard_drizzle` | весна, день, морось | camera inside a technical service yard, equipment sheds, cable drums, a small truck, gravel with puddles, fine drizzle, the main building barely visible far behind |
| 40 | `world_40_embankment_golden` | лето, золотой час | camera looking along a granite embankment wall, stone parapet and lamp posts receding, the water on one side, deep lateral view, the campus is behind the camera and not visible |
| 41 | `world_41_pier_dawn` | лето, рассвет | camera almost at water level on a wooden pier looking back toward the shore, low sun, still water, mooring posts, mist on the water |
| 42 | `world_42_shore_fog_mast` | осень, утро, туман | granite boulders on a shore in layered haze, a thin instrument mast barely visible in the fog, cold grey-blue palette |
| 57 | `world_57_campus_dense_fog_gate` | осень, утро, густой туман | camera at the entrance gate with iron bars in the foreground, buildings only as soft silhouettes in dense fog, long depth, lamps as glowing dots |
| 58 | `world_58_campus_stratus_service_side` | поздняя осень, день, низкий stratus | camera from the service-yard side looking at the campus buildings from an oblique rear angle, bare trees, low grey stratus, damp ground |

### Интерьеры без внешнего кампуса

| № | Файл | Свет | Промпт |
| --- | --- | --- | --- |
| 37 | `world_37_instrument_shop_door_rain` | день, дождь за окном | from the doorway looking deep into an instrument-makers workshop, benches, shelves of dials and barometers, a window with rain on the glass, grey light, no people |
| 38 | `world_38_workbench_lamp` | серый день + лампа | close view of a workbench from the position of an absent worker, tools, a half-assembled instrument, a lit desk lamp, grey window light, no people |
| 39 | `world_39_cable_store_tunnel` | пасмурно | low camera between cable drums and equipment crates in a storage hall, tunnel perspective, a few bare bulbs, concrete floor |
| 43 | `world_43_archive_aisle_rain` | осень, дождь | camera in the aisle between tall shelves looking toward a reading table, one-point perspective, folders and boxes, a rainy window with a neutral grey view |
| 44 | `world_44_archive_card_index` | тёплая лампа | low diagonal camera along rows of card-index drawers, a warm lamp reflecting on brass handles, shallow compressed depth |
| 45 | `world_45_archive_night_lamp` | ночь | archive at night, the window almost black, a green desk lamp and an open folder on the table, low-key lighting, deep shadows between the shelves |
| 46 | `world_46_hall_from_back_wall` | день, пасмурно | operational synoptic hall seen from the back wall toward tall windows, rows of desks with monitors showing weather maps, empty chairs, neutral grey light outside |
| 47 | `world_47_hall_reverse_twilight` | сумерки | the same kind of hall seen from the windows looking back into its depth, desk lamps lit, deep blue light at the glass, long rows of monitors |
| 48 | `world_48_hall_night_monitors` | ночь | operational hall at night, monitors as secondary light, lamps on some desks, layered depth, cups and papers left on tables |
| 49 | `world_49_cartography_table_low` | весна, ясное утро | camera almost at tabletop level in a cartography classroom, weather charts, coloured pencils and rulers in the foreground, bright morning light through plants |
| 50 | `world_50_cartography_topdown` | пасмурно | high oblique camera looking down at drawing tables with unrolled maps and pencils, chairs askew, even grey light |
| 51 | `world_51_aerology_balloon_foreground` | зима, день | an inflated pale weather balloon filling the foreground, the aerology room receding behind it, gas cylinders, instrument racks, a glass wall with snow outside |
| 52 | `world_52_aerology_through_glass` | зима, сумерки | camera outside looking in through a fogged window, blurred warm interior, frost on the frame, a balloon shape and shelves behind the glass |
| 53 | `world_53_radar_equipment_night` | ночь | camera between equipment racks looking toward glowing screens, cables, small indicator lights, tunnel perspective, a headset on a desk |
| 54 | `world_54_satellite_room_stratus` | день, stratus | wide-angle view from a room corner, satellite receivers and large wall monitors, a window with flat grey sky, desks and chairs |
| 55 | `world_55_cabin_stove_dawn` | зима, рассвет | station cabin seen from beside a stove toward a frosted window, wooden walls, a kettle, a jacket on a hook, warm and cold light mixing |
| 56 | `world_56_glass_pavilion_sunset` | лето, закат | low camera near the floor of a glass pavilion looking toward panoramic windows, glossy floor reflections, desks, a neutral sunset sky and no recognisable landmarks |

## Как использовать

1. Склеить префикс + промпт + суффикс, сгенерировать кадр, сохранить под именем из таблицы.
2. Положить в `assets/work/world_frames/` и сообщить: я проверю размер, срежу артефакты, напишу подписи по
   протоколу v4 и добавлю в сборщик.
3. Порядок приоритета: сначала 33, 37, 43, 46, 57, потом остальные (быстрее всего покажут, тянется ли радар и корпус).
4. Если генератор всё равно тянет знакомый корпус в интерьеры, добавьте в промпт `no exterior view, no building, only a plain blurred window light`.

## Жёсткая приёмка диагностических сцен 33, 37, 43, 46, 57

Если в кадре 37, 43 или 46 есть радар, главный корпус или узнаваемая панорама кампуса, кадр сразу уходит в резерв.
Подписью его не «спасаем»: иначе якорь на знакомый кампус попадёт в датасет под видом интерьера.

## Ведомость чекпоинтов v4-B

`eval_world_checkpoints.py` пишет `scorecard.csv` для базовой модели и каждого чекпоинта; `rank_world_checkpoints.py`
читает заполненную ведомость. Общего `total_score` нет: сначала veto, потом сравнение среди прошедших.

Направление всех оценок одно: **выше лучше**, кроме `cross_prompt_similarity`.
- Автоматически: `seed_diversity` (выше лучше, но два seed должны менять композицию, а не личность сцены) и
  `cross_prompt_similarity` (**ниже лучше**: высокое значение значит одну заготовку кампуса). Для базовой модели строка
  в ведомости обязательна: это эталон композиционной свободы без LoRA.
- Вручную, шкала 0–5, 5 = лучше: `style_fidelity`, `weather_transfer`, `composition_novelty`,
  `interior_isolation_archive` и `interior_isolation_hall` (5 = чистый интерьер, кампус не просачивается),
  `prompt_adherence_workshop` и `prompt_adherence_radar_low_angle` (отдельные сцены, не среднее по девяти).

Три veto (чекпоинт, не прошедший любое, выбывает независимо от красоты):
1. `interior_isolation` ≥ 4 в архиве и в оперативном зале.
2. `cross_prompt_similarity` не выше среднего по checkpoint-200 и 300 больше чем на 0.05 и не выше базовой модели больше чем на 0.15 (`cross_prompt_similarity_delta_vs_base` в ведомости): иначе уже испорченные 200/300 становились бы нормой.
3. `prompt_adherence` ≥ 4 на мастерской и на радаре снизу.

В ведомости для каждой строки `base / checkpoint-100…500 / final`: `seed_diversity`, `cross_prompt_similarity`, `delta_vs_base`, две оценки изоляции, adherence на мастерской и на радаре, style, weather, а также `weights_sha256`. `final` сравнивается с последним чекпоинтом по хэшу весов, а не считается им автоматически.

Среди прошедших порядок: `style_fidelity`, затем `weather_transfer`, затем `seed_diversity`. Пустая ручная оценка
считается провалом.

Три симптома позднего overfit: одинаковая перспектива при разных промптах; купол или главный корпус в архиве,
мастерской и зале; два seed дают почти одну композицию. Нужны кривые 100, 200, 300, 400, 500: если стиль растёт
монотонно, а композиционная новизна после 300 падает, это точка ранней остановки для следующего обучения.
Автометрика грубая (яркостная раскладка 32×18), она ловит стандартную компоновку, но не заменяет просмотр листов.

Пока идёт v4-B, обучающий набор и тренер не меняются: прогон остаётся воспроизводимым относительно зафиксированного
датасета и хэша тренера.

## Порядок для v5

v5 не продолжается автоматически от checkpoint-500. Сначала закончить проверку v4-B и выбрать лучший чекпоинт, затем
решить: дообучать его на расширенных 50–60 кадрах или запустить новый чистый прогон на обновлённом датасете.
Так композиционный overfit v4-B не переходит в v5.

## Критерий выбора чекпоинта v4-B

Чекпоинт считается перспективным, только если одновременно: держит pixel-style на знакомой сцене; не вставляет
купол и главный корпус в архив и мастерскую; переносит снег и сумерки без смены геометрии объекта; даёт заметно
разные композиции на двух seed; не превращает новые объекты в вариацию кампуса. Если 200 или 300 выигрывает по этим
признакам, база следующей итерации они, даже если 500 визуально красивее.
