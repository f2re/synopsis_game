# План миграции Hub на Three.js 2.5D + pixel pipeline

**Статус:** принято к реализации

**Принцип:** сначала доказать visual/technical viability на малом vertical slice, затем масштабировать. Запрещено заранее производить полный комплект 3D-моделей до прохождения shader/camera/geometry gates.

## 0. Definition of Done программы

Миграция считается завершённой, когда canonical Hub:

- рендерится из `HubWorldDefinition` через Three.js;
- сохраняет Geometry Lock 640×360;
- не требует отдельных полноэкранных изображений для сезона/погоды/времени суток;
- использует modular animated characters;
- сохраняет существующие semantic interactions и WorldBridge behaviour;
- имеет legacy fallback до отдельного решения об удалении;
- проходит visual acceptance и performance gates;
- documented sprite-only Hub production jobs больше не являются обязательным runtime pipeline.

## 1. Stage R0 — зафиксировать границы и измерения

### R0.1 — Scene-specific logical viewport

Сделать viewport API параметризуемым.

Требования:

- Hub: 640×360;
- legacy scenes: сохраняют текущий logical size до отдельной миграции;
- integer/nearest scaling не ломается;
- resize tests покрывают desktop/mobile/projector aspect cases.

**Gate R0-A:** смена Hub logical size не изменяет Archive/другие сцены.

### R0.2 — Geometry Lock manifest

Создать machine-readable geometry contract для Hub:

```text
camera
horizon
building footprints
entrances
paths
waterline
interaction anchors
safe zones
```

Каждый ключевой anchor должен иметь ID и canonical 640×360 coordinate.

**Gate R0-B:** автоматический snapshot/coordinate test выявляет drift ключевых anchors.

### R0.3 — Baseline metrics

Замерить текущий legacy Hub:

- FPS;
- frame time;
- texture memory;
- loaded asset bytes;
- draw calls если доступны;
- startup/load time;
- screenshot baseline.

**Результат:** baseline report для сравнения, без преждевременной оптимизации.

---

## 2. Stage R1 — renderer spike

Цель: доказать pipeline, не строить весь Hub.

### R1.1 — Three.js integration shell

Добавить внутри `@synopsis/world-engine`:

```text
renderer/three/
  ThreeHubRenderer
  camera/
  post/
  materials/
```

Feature flag:

```text
hubRenderer = legacy2d | three2d
```

В dev разрешить query/config override.

**Gate R1-A:** оба renderer-а запускаются из одного приложения без изменения React routes/game state.

### R1.2 — Orthographic camera proof

Сцена содержит только:

- ground;
- waterline/reference plane;
- одну path geometry;
- один building block;
- geometry-lock markers в debug mode.

**Gate R1-B:** screen-space anchors совпадают с canonical Geometry Lock.

### R1.3 — Pixel post-processing proof

Реализовать минимум:

- 320×180 render target;
- nearest upscale;
- 3-band lighting;
- canonical palette mapping;
- Bayer 4×4;
- depth/normal selective edges.

Сделать toggles каждого pass для art review.

**Gate R1-C:** visual review подтверждает, что сцена выглядит как намеренная pixel art, а не low-poly + pixelate filter.

### R1.4 — Day/night proof

Одна geometry сцена должна переключаться между day/night через:

- light state;
- ambient/sky palette;
- emissive window;
- fog/environment settings.

**Gate R1-D:** нет отдельного building/background image на night state.

---

## 3. Stage R2 — state-driven environment proof

### R2.1 — Weather

Реализовать:

- clear;
- rain;
- snow;
- fog;
- overcast как light/environment state.

Rain/snow — particles; wetness/snow amount — material parameters.

**Gate R2-A:** переключение weather не меняет geometry anchors и не загружает full-scene weather PNG.

### R2.2 — Season

Реализовать:

- spring;
- summer;
- autumn;
- winter.

На vertical slice достаточно:

- one deciduous tree;
- ground;
- one roof;
- one shrub group.

**Gate R2-B:** все 4 сезона используют одни base geometry instances, кроме документированных silhouette exceptions.

### R2.3 — Water + atmosphere

Добавить дешёвые:

- quantized water highlights;
- horizon haze/fog;
- optional sparse clouds;
- controlled wind parameter.

**Gate R2-C:** отсутствие shimmer/blur на pixel grid при движении pattern/particles.

---

## 4. Stage R3 — `HubWorldDefinition`

### R3.1 — Extract semantic world data

Из текущих Hub layers/building definitions извлечь renderer-independent данные:

- buildings;
- footprints;
- entrances;
- windows/state capabilities;
- paths;
- collision;
- vegetation groups;
- interaction anchors;
- NPC spawns/routes.

Legacy renderer временно должен уметь читать те же canonical данные там, где это практично.

**Gate R3-A:** semantic building/entrance coordinates существуют в одном источнике, а не дублируются по render layers.

### R3.2 — Geometry factories

Создать factories:

```text
BuildingFactory
RoofFactory
PathFactory
TerrainFactory
WindowFactory
PropFactory
TreeFactory
```

**Gate R3-B:** не менее 3 визуально разных зданий создаются parameterized geometry без отдельных full-building images.

### R3.3 — Interaction mapping

Mesh/userData должен ссылаться на semantic IDs.

**Gate R3-C:** click/raycast по зданию генерирует тот же gameplay interaction, что legacy scene.

---

## 5. Stage R4 — полный Hub geometry pass

### R4.1 — Campus massing

Перенести:

- terrain/coast;
- plaza;
- roads/paths;
- water;
- canonical buildings.

На этом этапе не добавлять декоративную мелочь сверх необходимого для silhouette.

**Gate R4-A:** black/flat material screenshot уже совпадает по композиции с Geometry Lock.

### R4.2 — Architecture detail kit

Добавить reusable:

- windows;
- doors;
- roof variants;
- chimneys;
- vents;
- pipes;
- railings;
- masts;
- antennas;
- lamps;
- signs/decals.

**Gate R4-B:** repeated detail использует instancing/reuse, а не unique mesh copy без причины.

### R4.3 — Vegetation pass

Создать малый library variants и instancing.

**Gate R4-C:** seasonal transition работает без замены всей vegetation scene.

---

## 6. Stage R5 — character vertical slice

### R5.1 — Canonical rig

Создать один humanoid rig и tooling validation:

- scale;
- orientation;
- bone names;
- required sockets;
- GLB cleanliness.

**Gate R5-A:** validator отклоняет несовместимый character asset до runtime.

### R5.2 — Base animations

Сначала только:

- idle;
- walk.

Implement `CharacterAnimator` с pose quantization 8–12 FPS.

**Gate R5-B:** renderer 60 FPS + pose cadence 10 FPS выглядит стабильно, без foot jitter и excessive smoothness.

### R5.3 — Modular appearance

Минимум:

- 3 heads/hair combinations;
- 3 torso/clothing variants;
- palette slots;
- one headgear;
- one hand attachment.

**Gate R5-C:** минимум 3 NPC выглядят различно без 3 отдельных full character GLB.

### R5.4 — Facing and movement

Visual facing quantize к 8 directions; movement остаётся logical.

**Gate R5-D:** один walk clip работает во всех направлениях; no directional sprite sheets.

---

## 7. Stage R6 — NPC and living world integration

### R6.1 — Existing NPC semantics

Подключить существующие NPC IDs/schedules/actions к character renderer.

### R6.2 — Ambient props/fauna

Приоритет:

1. procedural/instanced;
2. simple sprite/billboard if artistically justified;
3. GLB only for useful silhouette/animation.

Не переводить всё в 3D автоматически.

### R6.3 — Building progression

Подключить building state через:

- emissive;
- accent/outline;
- entrance/sign state;
- local effect.

**Gate R6:** основные current Hub state transitions работают без отдельного raster facade state, кроме явно сохранённых legacy exceptions.

---

## 8. Stage R7 — art pass and style convergence

### R7.1 — Palette convergence

Все imported/procedural materials должны маппиться в canonical palette groups.

### R7.2 — Silhouette review

Проверить на 320×180:

- buildings;
- trees;
- characters;
- meteo instruments;
- interactive props.

Удалить geometry detail, который не читается.

### R7.3 — State matrix snapshots

Автоматически получить canonical screenshots:

```text
summer/day/clear
summer/night/clear
autumn/golden/overcast
winter/day/snow
spring/dusk/rain
fog stress case
```

**Gate R7:** art review по `PIXEL_3D_STYLE_CONTRACT` и `HUB_VISUAL_ACCEPTANCE`.

---

## 9. Stage R8 — performance and degradation

### R8.1 — Metrics

Проверить:

- FPS/frame time;
- draw calls;
- visible triangles;
- texture memory;
- load time;
- shader compile stalls;
- animation mixer cost;
- particles;
- context loss/recovery.

### R8.2 — Optimisation order

Оптимизировать только по измерениям:

1. eliminate duplicate loads/materials;
2. instancing/batching;
3. particle density;
4. shadow simplification;
5. vegetation density;
6. internal resolution;
7. optional post pass removal.

Не начинать с агрессивного geometry compression, если bottleneck находится в другом месте.

### R8.3 — Quality profiles

Реализовать `high`, `balanced`, `reduced` + отдельный `reducedMotion`.

**Gate R8:** defined desktop, projector and mid-range mobile profiles проходят performance acceptance.

---

## 10. Stage R9 — migration switch

### R9.1 — Default renderer switch

После прохождения R0–R8:

```text
hubRenderer default = three2d
```

Legacy остаётся feature-flag fallback на ограниченный период.

### R9.2 — Asset pipeline cleanup

Классифицировать существующие Hub raster assets:

- keep runtime;
- keep reference only;
- deprecated;
- delete candidate.

Season/weather Geometry Lock batches в первую очередь переводятся в `reference only`, если их смысл полностью покрыт runtime states.

### R9.3 — Documentation supersession

Обновить sprite production docs так, чтобы они не требовали создавать runtime sprites для категорий, уже реализованных 2.5D renderer-ом.

**Gate R9:** новая задача по weather/season/building state не запускает автоматическое производство полного набора изображений.

---

## 11. Stage R10 — legacy removal decision

Удаление legacy Hub renderer выполняется только отдельным решением после периода эксплуатации.

Условия:

- Three.js renderer стабилен;
- fallback статистически не нужен либо заменён simpler degraded path;
- snapshot/performance tests устойчивы;
- нет незакрытых regression blockers.

До этого legacy code не удаляется только ради «чистоты» архитектуры.

---

## 12. Рекомендуемая структура задач

```text
H3D-001 scene-specific viewport
H3D-002 geometry lock manifest/tests
H3D-003 ThreeHubRenderer shell
H3D-004 orthographic camera mapping
H3D-005 low-res framebuffer
H3D-006 palette/light shader
H3D-007 dithering
H3D-008 depth/normal edges
H3D-009 environment state
H3D-010 weather particles
H3D-011 snow/wetness materials
H3D-012 HubWorldDefinition
H3D-013 building factories
H3D-014 path/terrain/water geometry
H3D-015 vegetation instancing
H3D-016 semantic picking
H3D-017 canonical humanoid rig
H3D-018 CharacterAnimator
H3D-019 modular cosmetics/palette
H3D-020 NPC integration
H3D-021 building progression rendering
H3D-022 state snapshot matrix
H3D-023 performance profiles
H3D-024 default renderer switch
H3D-025 asset pipeline cleanup
```

## 13. Parallelisation rules

После R1-C можно параллелить:

- world-definition extraction;
- procedural building kit;
- character rig prototype;
- weather/material experiments.

До R1-C **не** запускать массовое моделирование: shader/style uncertainty должна быть снята первой.

Character art и world geometry могут идти параллельно только после фиксации camera scale, чтобы реальный экранный размер персонажа был известен.

## 14. Pull request policy

Предпочтительный размер изменений:

- один infrastructure contract/feature на PR;
- visual shader pass отдельно от массовой geometry migration;
- character rig отдельно от cosmetics library;
- performance optimisation отдельно от feature behaviour.

Каждый PR, влияющий на внешний вид, должен при возможности содержать canonical 640×360 snapshots до/после.

## 15. Testing strategy

Минимум:

- unit tests: coordinate transforms, state mapping, material parameter derivation;
- contract tests: `HubWorldDefinition` schema;
- snapshot tests: canonical anchors and state matrix;
- integration tests: WorldBridge → renderer state;
- interaction tests: screen click → semantic ID;
- performance smoke tests;
- WebGL context loss/recovery smoke test;
- reduced-motion/reduced-quality tests.

## 16. Stop conditions

Работа останавливается и возвращается к design/architecture review, если:

- Geometry Lock невозможно воспроизвести без существенного reframe;
- pixel pipeline не проходит visual acceptance;
- Three.js integration ломает Phaser lifecycle/input/UI boundary;
- mid-range target device не достигает acceptable performance после измеримых оптимизаций;
- authoring сложнее текущего sprite pipeline без сокращения числа runtime states.

Stop condition означает изменение решения, а не производство большего количества ассетов в надежде скрыть проблему.

## 17. Связанные документы

- `docs/decisions/ADR-0007-threejs-2-5d-pixel-renderer.md`
- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`
- `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md`
- `docs/design/HUB_VISUAL_ACCEPTANCE.md`
