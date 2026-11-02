# Игровой рабочий контур, WebGL и графические ресурсы

**Статус:** принято

## 1. Граница рабочих контуров

```text
React application
├── DOM/CSS UI
├── map-engine (SVG/Canvas; meteorological geometry)
└── GameWorld mount
    └── @synopsis/world-engine
        ├── Phaser 4 / WebGL
        │   ├── scene lifecycle
        │   ├── input
        │   ├── audio
        │   ├── UI/HUD
        │   └── WorldBridge integration
        └── Hub renderer
            └── Three.js 2.5D + pixel post-processing
```

Phaser не является оболочкой всего приложения. Он отвечает за игровой цикл живого мира и интеграцию с приложением; обычный интерфейс остаётся в React. Профессиональная метеорологическая карта остаётся отдельным SVG/Canvas-модулем.

Three.js не заменяет Phaser глобально. Он является специализированным renderer нового Hub и будущих сцен, которым нужен тот же 2.5D visual contract.

Подробное архитектурное решение: [`ADR-0007`](../decisions/ADR-0007-threejs-2-5d-pixel-renderer.md).

## 2. Слои ответственности мира

Новый Hub разделён не по PNG-слоям, а по смыслу:

```text
world state
→ renderer-independent HubWorldDefinition
→ geometry/materials/characters/environment
→ low-resolution beauty/depth/normal buffers
→ palette/dither/edge passes
→ nearest upscale
→ Phaser UI/HUD
```

Legacy Phaser layers могут существовать параллельно до завершения миграции.

`world-engine` получает состояние мира и детерминированные зерна событий. Покадровая декоративная анимация выполняется локально. Сервер не передаёт координату каждой птицы, частицы, кости или визуального объекта на каждом кадре.

## 3. Каноническое пространство Hub

Для нового Hub:

```text
logical gameplay/composition space: 640×360
internal 3D render target:          320×180 default
final sampling:                     nearest-neighbor
camera:                             fixed orthographic
```

Старые сцены не обязаны автоматически переходить на 640×360. Viewport helper должен принимать scene-specific logical dimensions.

Geometry Lock включает camera/framing, horizon, building footprints, paths, waterline, entrances и ключевые interaction anchors.

## 4. Производственный путь 2D-ресурсов

Для UI, portraits, documents, icons, legacy scenes и намеренно raster elements сохраняется существующий путь:

```text
Aseprite / Pixelorama / approved source
        ↓
assets/source + assets/manifests
        ↓
sprite-tools / asset validation / packing
        ↓
assets/generated
        ↓
Phaser loader
```

Производные ресурсы не редактируются вручную.

## 5. Производственный путь Hub 2.5D

Для Hub главным источником истины являются world data и reusable geometry.

```text
HubWorldDefinition
      │
      ├── procedural geometry factories
      ├── reusable mesh kit
      ├── GLB/glTF for complex assets
      ├── modular humanoid rig
      ├── palette/material definitions
      └── environment state
              ↓
         ThreeHubRenderer
              ↓
        pixel post-processing
```

Приоритет authoring:

1. procedural primitive/geometry;
2. reusable parameterized kit;
3. instanced mesh;
4. GLB;
5. raster billboard only by explicit artistic choice.

Запрещено заменять sprite proliferation на GLB proliferation.

## 6. Контракт пиксельной отрисовки

- final pixel grid стабилен;
- nearest-neighbor используется после final low-resolution render;
- случайное сглаживание при масштабировании запрещено;
- world lighting quantized в 3–4 bands;
- world colors проходят через canonical palette discipline;
- ordered dithering предпочтительнее temporal random noise;
- depth/normal edges selective, а не global black toon outline;
- частота pose animation персонажа может быть ниже render FPS;
- движение, tween, camera и particles могут обновляться с render FPS;
- огромные заранее отрисованные полноэкранные состояния запрещены там, где state выражается material/uniform/particles;
- покадровое состояние не передаётся через React;
- reduced-motion и reduced-quality profiles обязательны.

Полный visual contract: [`PIXEL_3D_STYLE_CONTRACT.md`](../design/PIXEL_3D_STYLE_CONTRACT.md).

## 7. Состояния мира

Сезон, погода, время суток и progression описываются данными.

Пример:

```text
season → foliage palette/density, grass, snow amount
weather → rain/snow particles, wetness, fog, wind
phase → key light, ambient palette, sky, emissive windows
building state → emission, accent, sign/decal, local effect
```

Изменение этих состояний не должно менять canonical geometry или требовать нового full-scene image.

## 8. Персонажи

Для 2.5D Hub используется общий modular character pipeline:

- shared humanoid skeleton;
- shared animation library;
- modular clothing/hair/headgear/accessories;
- palette-slot recoloring;
- рабочий контур facing;
- 8–12 FPS pose cadence при более высокой частоте renderer-а;
- игровой процесс position остаётся авторитетной, root motion не используется как источник движения.

Полный контракт: [`CHARACTER_2_5D_ANIMATION_CONTRACT.md`](CHARACTER_2_5D_ANIMATION_CONTRACT.md).

## 9. Физика и взаимодействия

3D renderer не становится источником игровой процесс physics.

- collision: simple 2D polygons/shapes;
- routes: logical world coordinates;
- picking: Three.js raycast допускается;
- результат picking преобразуется в stable semantic interaction ID;
- игровой процесс не зависит от mesh/material UUID.

Полный 3D physics engine не добавляется без отдельного ADR.

## 10. Владение файлами

- `assets/source` — редактируемые 2D-исходники и approved source assets;
- `assets/scenes` — legacy/Tiled scene sources там, где они ещё используются;
- `assets/manifests` — semantic metadata/provenance;
- `assets/generated` — производные ресурсы;
- `tools/assets` — преобразование, validation и packing;
- `packages/world-engine` — Phaser lifecycle + Three.js Hub renderer + pixel pipeline;
- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md` — нормативный renderer contract;
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md` — нормативный visual contract.

## 11. Feature flag и миграция

На время перехода поддерживается:

```text
hubRenderer = legacy2d | three2d
```

Default renderer меняется только после прохождения geometry, visual, interaction и performance gates.

Полный порядок: [`HUB_2_5D_MIGRATION.md`](../roadmap/HUB_2_5D_MIGRATION.md).

## 12. Performance contract

Целевые ориентиры Hub:

- 320×180 default internal render target;
- 60 FPS desktop preferred;
- 30 FPS minimum / 60 preferred на целевом mid-range mobile;
- ≤150k visible triangles preferred;
- ≤80 draw calls preferred, >150 требует review;
- 20–30 simultaneous animated humanoids;
- один default shadow-casting key light;
- 32–64 MB texture memory preferred for Hub.

Оптимизация выполняется после измерений. Quality profiles: `high`, `balanced`, `reduced`; reduced-motion является отдельным profile axis.

## 13. Связанные материалы

- [`ADR-0007`](../decisions/ADR-0007-threejs-2-5d-pixel-renderer.md)
- [`HUB_2_5D_RENDERER_CONTRACT.md`](HUB_2_5D_RENDERER_CONTRACT.md)
- [`CHARACTER_2_5D_ANIMATION_CONTRACT.md`](CHARACTER_2_5D_ANIMATION_CONTRACT.md)
- [`PIXEL_3D_STYLE_CONTRACT.md`](../design/PIXEL_3D_STYLE_CONTRACT.md)
- [`HUB_2_5D_MIGRATION.md`](../roadmap/HUB_2_5D_MIGRATION.md)
- [`PIXEL_ASSET_PIPELINE.md`](../design/PIXEL_ASSET_PIPELINE.md) — для retained 2D/legacy assets
