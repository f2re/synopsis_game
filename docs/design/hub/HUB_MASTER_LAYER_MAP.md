# Hub — карта production-слоёв утверждённого master

Статус: **ART-DIRECTOR REVIEW REOPENED / CHANGES REQUIRED**.

## 1. Единственный источник композиции

Утверждённый master — `image-gen-1(20261025-183207).png`, 1672×941, RGB PNG, 2 953 225 bytes, SHA-256 `3efc212bdcd7eaaacac119d20cbd89f83ab62d3d9761aafd5abdacae5660a340`.

Композиция заморожена. Запрещено переставлять центральный корпус, Радар, Карты и анализ, Аэрологию, Архив, Турнирный зал, площадь, глобус/фонтан, персонажей, горизонт и интерфейсные зоны ради удобства реализации.

Runtime source of truth: `packages/contracts/hub-main-screen.contract.json`.

## 2. Почему прежний production-подход отозван

Предыдущий первый срез объединил master целиком, включая L7 UI, в WebP 960×540 размером 62 434 bytes и растянул его на fullscreen viewport. Это нарушило исходные задачи #28 и #24 и дало визуальную деградацию на реальном экране.

Поэтому:

- `hub.runtime.legacy-960` считается deprecated fallback;
- он не является основанием для `ART_ACCEPTED`;
- fullscreen raster не может иметь source texture ниже 1672×941;
- UI больше не считается допустимой частью финального environment plate.

## 3. Финальная production-карта

Все растровые слои используют одну регистрацию и один master canvas 1672×941. Logical interaction grid остаётся 960×540 и не определяет разрешение графики.

| Слой | Содержание | Production-правило |
|---|---|---|
| L0 | `sky_atmosphere` | отдельный слой/plate; участвует в time-of-day grading |
| L1 | `distant_city_water` | статическая дальняя сцена; допускает отдельные водные блики |
| L2 | `terrain_paths_plaza` | статический рельеф, дорожки, площадь |
| L3 | `architecture` | здания и сооружения без runtime UI |
| L4 | `vegetation_props` | растительность, фонари, оборудование; foreground может быть вынесен для параллакса |
| L5 | `characters_fauna_dynamic` | персонажи, птицы, флаги, приборы и иные анимируемые семейства |
| L6 | `lighting_weather` | маски света, неба, погоды и атмосферных эффектов |
| L7 | `runtime_ui` | верхняя панель, профиль, настройки, подписи локаций, нижняя навигация, CTA, уведомления |

L7 **не запекается** в clean environment plate.

## 4. Обязательные маски времени суток

Минимальный набор с одинаковым canvas/registration:

- `hub.mask.environment` — область мира, на которую разрешён общий world grading;
- `hub.mask.sky` — небо/дальняя атмосфера;
- `hub.mask.window_light` — свет окон и внутренних помещений;
- `hub.mask.lamp_glow` — фонари и локальные наружные источники света.

UI исключён из world-lighting.

Канонические состояния:

- `day` — яркий нейтрально-холодный дневной свет, тёплые источники приглушены;
- `noon` — максимум рассеянного дневного света, минимальный тёплый cast;
- `twilight` — утверждённый master является визуальным baseline;
- `night` — холодное затемнение окружения плюс additive warm masks окон/фонарей.

Runtime presets: `packages/world-engine/src/scenes/hub/timeOfDay.ts`.

## 5. Временный high-fidelity fallback

Пока pixel-asset-designer из #24 не изготовил clean environment plate, допускается временно показывать полный утверждённый master или его high-fidelity native derivative.

Условия:

- source texture не меньше 1672×941;
- композиция не меняется;
- derivative проходит пороги качества из `hub-main-screen.contract.json`;
- world grading исключает baked UI regions;
- такой fallback не получает финальный `ART_ACCEPTED`.

Контрольный кандидат, подготовленный из подтверждённого master без изменения композиции: WebP quality 90, 1672×941, 542 536 bytes, SHA-256 `5b95c10588577d987cbf885606e1af98166d3bd905a09911931326e4222f428f`, PSNR 32.3335 dB, MAE 3.6334/channel.

## 6. Интерактивная разметка

Канонические semantic IDs и logical hit zones хранятся в `assets/scenes/hub/hub_master.scene.json`. Logical coordinate space — 960×540; она используется только для hit testing/anchors и не разрешает уменьшать графику до 960×540.

Основные IDs:

- `hub.profile`;
- `hub.settings`;
- `hub.location.radar`;
- `hub.location.maps-analysis`;
- `hub.location.aerology`;
- `hub.location.archive`;
- `hub.location.tournament-hall`;
- `hub.location.synoptic-center`;
- `hub.nav.blitz`;
- `hub.nav.duel`;
- `hub.nav.start-shift`;
- `hub.nav.inventory`;
- `hub.nav.tournament`;
- `hub.nav.archive`;
- `hub.nav.tasks`.

## 7. Масштабирование и sampling

Camera policy — `cover`: viewport полностью заполнен сценой, внешние края симметрично обрезаются при несовпадении aspect ratio.

Запрещено использовать nearest-neighbour fullscreen scaling при произвольном нецелом коэффициенте для уже отрендеренного master: это создаёт неодинаковый визуальный размер пикселя. Pixel grid контролируется на уровне исходных production assets, а fullscreen master/plate масштабируется как high-resolution texture.

## 8. Gate повторной приёмки

До `ART_ACCEPTED` необходимо:

1. импортировать подтверждённый source master по каноническому пути;
2. изготовить clean environment plate и L7 runtime UI;
3. подключить четыре обязательные lighting masks;
4. проверить `day/noon/twilight/night`;
5. собрать static composite и сравнить с master вне declared dynamic/UI masks;
6. снять browser screenshots минимум 1920×1080, 2560×1440, 1440×900 и mobile portrait;
7. прогнать `pnpm hub:art-contract:check`;
8. получить повторный PASS `pixel-art-quality-reviewer`, затем `art-director`.

До выполнения этих пунктов review остаётся открытым.
