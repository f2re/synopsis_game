# Конвейер пиксельной графики и анимации

**Статус:** принято для 2D/legacy raster assets.

## Область действия

Этот документ остаётся нормативным для:

- dialogue/profile portraits;
- UI icons/frames;
- documents and maps as raster art;
- legacy scenes;
- companions/props/VFX, если они намеренно остаются 2D;
- иных raster assets, для которых спрайт является осознанным production format.

Для **нового Hub** этот документ больше не является основным runtime production contract. При конфликте применяются:

- `docs/decisions/ADR-0007-threejs-2-5d-pixel-renderer.md`;
- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`;
- `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`;
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md`.

Новый Hub строится `world-definition-first`: geometry, materials, environment state, particles и modular characters. Существующие AI-generated Hub batches могут сохраняться как art-direction references и не обязаны становиться runtime layers.

Классы `world_character`, `architecture_landmark`, `architecture_small`, `terrain_tile`, `vegetation_sprite` и `large_scene` ниже описывают raster production **только там, где raster representation явно сохранено**. Их наличие не создаёт требования производить новый sprite/PNG для каждого Hub state.

## Контракт подготовки исходников

Основной редактор — Aseprite. Свободная альтернатива — Pixelorama. Канонический редактируемый формат спрайта — `.aseprite`. Канонический редактор legacy сцен — Tiled с JSON-форматами `.tmj/.tsj`.

Каждый производственный raster resource имеет манифест: стабильный идентификатор, путь к исходнику, логические размеры, pivot/origin, состояния анимации, роль палитры, слой мира, provenance и ожидаемые производные файлы.

Канонические художественные документы:

- `docs/design/PORTRAIT_ART_DIRECTION.md`;
- `docs/design/ENVIRONMENT_ART_DIRECTION.md`;
- `docs/design/SPRITE_CLASS_MATRIX.md`;
- `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md`.

Для 2.5D Hub дополнительно обязателен `docs/design/PIXEL_3D_STYLE_CONTRACT.md`.

## Производственный конвейер

Для локальной ИИ-генерации raster assets используются машинные профили `config/art-generation-profiles.json`.

```text
SPEC
→ CLASS PROFILE
→ PROMPT COMPILE
→ CANDIDATES
→ RANK/SELECT
→ CLASS-SPECIFIC REFINEMENT
→ ART REVIEW
→ TECHNICAL CONTRACT CHECK
→ APPROVED SOURCE
→ PACK
```

Нельзя автоматически принимать первый результат или превращать обычную AI-иллюстрацию в финальную графику агрессивным уменьшением и жёсткой квантизацией.

Этот pipeline не применяется автоматически к procedural geometry, GLB characters, Three.js materials или runtime environment states.

## Классы графики

Независимые raster-классы:

- `dialogue_portrait`;
- `profile_portrait`;
- `world_character`;
- `companion_sprite`;
- `architecture_landmark`;
- `architecture_small`;
- `interactive_object`;
- `prop_sprite`;
- `terrain_tile`;
- `vegetation_sprite`;
- `ui_icon`;
- `ui_frame`;
- `vfx_small`;
- `large_scene`.

Один workflow для нескольких классов запрещён. Портрет, мировой персонаж, тайл, здание, UI и крупная сцена выполняют разные художественные задачи.

Для Hub эти классы не должны использоваться для искусственного размножения runtime variants, если состояние уже выражается 2.5D renderer-ом.

## Представления персонажа

В retained raster pipeline персонаж может иметь разные графические представления:

- `dialogue_portrait`: 256×320 logical px, высокодетальный мастер;
- `profile_portrait`: 160×160, отдельная компактная композиция;
- `world_character`: 32×48, legacy/explicitly-raster игровой спрайт;
- `companion_sprite`: отдельный профиль для животных и спутников, если выбран raster representation.

Для нового 2.5D Hub humanoid world character определяется `CHARACTER_2_5D_ANIMATION_CONTRACT.md`; наличие портретов не требует sprite sheet мирового персонажа.

Диалоговый портрет не должен выглядеть как увеличенный мировой спрайт. Мировое представление не должно быть безликим манекеном.

## Цвет

Количество цветов не является самостоятельным критерием качества. Используются классовые цветовые рампы и художественно оправданные диапазоны.

Ориентиры финальных raster resources:

- dialogue portrait: 48–96;
- profile portrait: 36–72;
- world character: 24–48;
- companion sprite: 24–48;
- architecture landmark: 48–96;
- architecture small: 32–72;
- interactive object: 28–64;
- prop sprite: 24–56;
- terrain tile: 24–48;
- vegetation sprite: 28–64;
- UI icon: 12–32;
- UI frame: 24–56;
- VFX small: 16–40;
- large scene: 96–192.

Мягкие потолки задаются в `config/art-generation-profiles.json` и используются для диагностики шума, а не для автоматического художественного отклонения.

`strictQuantization=true` в generation profiles запрещён.

Для 2.5D Hub количество runtime цветов и palette mapping определяются `PIXEL_3D_STYLE_CONTRACT.md`, а не таблицей raster classes выше.

## Язык пикселя

Пиксельный стиль проекта не означает одинаковый размер художественного кластера для всех классов.

- портрет — мелкий аккуратный шаг и мимика;
- мировой raster-персонаж — средние кластеры, силуэт и одежда;
- raster-архитектура — материалы, конструкция и свет;
- prop — узнаваемость и фактура;
- тайл — поверхность и бесшовность;
- UI — чистота и семантика;
- raster-сцена — композиция, глубина и погода.

В новом Hub pixel language формируется low-resolution rendering, palette quantization, discrete light bands, ordered dithering и selective depth/normal edges.

## Прозрачность

Для raster assets основной путь: контролируемый фон/матт + mask/segmentation → финальная alpha. `#FF00FF` разрешён только как запасной режим конкретного workflow.

Это правило не относится к opaque/procedural 3D geometry и material pipeline.

## Нормализация и доработка

Доработка raster asset не исправляет плохую художественную основу.

Она может:

- очищать случайный шум;
- исправлять неудачные кластеры;
- гармонизировать цвет;
- очищать outline;
- приводить результат к логической сетке;
- очищать alpha.

Запрещены:

- majority downsampling;
- глобальная жёсткая posterization;
- уничтожение мимики;
- уничтожение материалов;
- изменение крупного силуэта;
- потеря световой атмосферы;
- превращение предметов и зданий в generic-иконки.

Если refined хуже selected raw, он отклоняется.

## Мир и вайб

Окружение проверяется по `ENVIRONMENT_ART_DIRECTION.md` и, для 2.5D Hub, по `PIXEL_3D_STYLE_CONTRACT.md`.

В обитаемой сцене обязательны:

- профессиональная функция;
- читаемые материалы;
- погодное состояние;
- северо-западный характер;
- минимум три человеческих следа;
- один локальный сюжетный крючок.

## Политика анимации

Плавность движения не означает 60 нарисованных кадров/с. Для raster animation художественная частота составляет примерно 4–15 кадров/с; camera, tween и положение объекта могут обновляться с частотой дисплея.

В 2.5D character pipeline тот же принцип выражается дискретизацией skeletal pose примерно до 8–12 pose updates/с при более высокой render FPS.

## Техническая проверка

Для raster assets технические проверки оценивают:

- manifest/provenance;
- logical size;
- pivots/origin;
- frame-grid/tags/durations;
- alpha-контракт принятого финала;
- ссылки на generated outputs;
- воспроизводимость упаковки.

Плохой, но технически корректный ассет обязан иметь `art_status: fail`.

3D/2.5D assets проверяются отдельными контрактами: scale/orientation, skeleton compatibility, semantic IDs, material/palette compatibility и runtime budgets.

## Регрессионные проверки

- `tools/assets/check_asset_contract.py` — структура подходящих manifest-схем;
- `tools/assets/check_generation_profiles.py` — защита raster classes от разрушительной унификации.

Регрессионная проверка raster pipeline обязана падать, если:

- пропадает обязательный retained raster class;
- два raster class используют один workflow;
- включается majority downsampling;
- включается строгая квантизация;
- цветовой диапазон класса искусственно схлопывается;
- профиль теряет собственные `artPriorities`.

Эти проверки не заменяют арт-директора и не являются валидатором 2.5D Hub renderer.

## Художественная приёмка

Арт-директор оценивает ассет или runtime scene в его реальном игровом масштабе.

Принимается не «пиксельность», а совокупность:

- функции;
- красоты;
- цвета;
- материала;
- света;
- читаемости;
- лора;
- вайба 26063.

Для raster assets не принимаются неизвестное происхождение, ручная правка производных файлов, несовместимые pivots, невоспроизводимая сборка, случайное сглаживание маленьких спрайтов, дублирование полной геометрии дня/ночи и автоматическое `approved` по числу цветов.

Для 2.5D Hub не принимаются отдельные runtime PNG/GLB на каждый weather/season/day state, если то же состояние должно выражаться material/environment parameters согласно новым контрактам.
