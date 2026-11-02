# ADR-0007 — Three.js 2.5D renderer для Hub с пиксельным post-processing

**Статус:** принято

**Дата:** 2026-11-02

## Исходная ситуация

Текущий `@synopsis/world-engine` построен на Phaser 4 и уже содержит правильные для проекта принципы: React не получает покадровое состояние мира, `WorldBridge` передаёт дискретные события и состояние, часть окружения и погоды создаётся процедурно, а состояния сезона, времени суток и зданий отделены от UI.

Одновременно производственный графический контур исторически ориентирован на спрайты, растровые слои, наборы состояний и AI-generated pixel assets. Для Hub это создаёт комбинаторный рост ресурсов: сезоны, погода, время суток, состояния зданий, направления персонажей и анимационные кадры требуют всё большего числа изображений и увеличивают риск геометрического дрейфа между вариантами.

Новые требования к Hub фиксируют неизменную геометрию сцены и каноническую композицию 640×360. При этих условиях выгоднее хранить мир как данные и геометрию, а визуальные состояния получать в runtime через материалы, освещение, particles и post-processing.

## Решение

Для Hub принимается гибридный рабочий контур:

```text
React application
└── GameWorld mount
    └── @synopsis/world-engine
        ├── Phaser 4
        │   ├── lifecycle
        │   ├── input
        │   ├── audio
        │   ├── UI/HUD
        │   └── WorldBridge integration
        └── Three.js Hub renderer
            ├── orthographic 2.5D scene
            ├── procedural/reusable geometry
            ├── GLB only for complex reusable assets
            ├── modular skinned characters
            ├── materials + lighting + particles
            └── low-resolution pixel post-processing
```

Phaser остаётся игровым framework и владельцем жизненного цикла мира. Three.js становится специализированным renderer только для нового Hub и последующих сцен, которым нужен такой же подход. Переход всего приложения или метеорологического `map-engine` на Three.js не выполняется.

### Каноническое пространство Hub

- gameplay/composition coordinates Hub: **640×360**;
- default internal 3D render target: **320×180**;
- upscale: nearest-neighbor до 640×360, затем до физического viewport;
- камера: фиксированная `OrthographicCamera`;
- perspective camera для канонического Hub запрещена;
- положение камеры, horizon, building footprints, paths, waterline и ключевые gameplay anchors являются частью Geometry Lock.

Глобальные константы 480×270 не заменяются вслепую. Старые сцены могут сохранить своё логическое пространство. Viewport helper должен принимать размеры сцены явно.

### Pixel pipeline

Порядок обязателен:

```text
3D geometry/materials
→ discrete/toon lighting
→ fog/environment
→ low-resolution beauty/depth/normal buffers
→ palette quantization
→ ordered Bayer dithering
→ selective depth/normal edges
→ nearest-neighbor upscale
```

Простой screen pixelation без palette/light discipline не считается реализацией контракта.

### Мир как данные

Hub должен иметь renderer-independent `HubWorldDefinition`, содержащий как минимум:

- world anchors and coordinate mapping;
- buildings: footprint, bounds, entrance, state semantics, windows, tags;
- paths and walkable/collision polygons;
- vegetation spawn groups;
- prop spawn groups;
- NPC spawn points and routes;
- interaction IDs;
- geometry lock metadata.

Legacy 2D и новый Three.js renderer могут временно читать один `HubWorldDefinition`, пока миграция не завершена.

### Сезон, погода и время суток

Новые runtime-варианты Hub не должны создаваться как полноэкранные растровые версии одной и той же геометрии.

Состояния реализуются параметрами мира и renderer uniforms/material parameters:

- season: foliage palette/density, grass palette, snow amount, leaf/flower particles;
- weather: rain/snow intensity, wetness, fog, wind, cloud/light state;
- day phase: key light, ambient palette, sky state, window emission, stars;
- building state: emissive windows, outline/accent, signs/decals, local effects.

Растровые сезонные/погодные изображения могут использоваться как art-direction references, но не являются обязательными runtime-ассетами.

### Персонажи

Для человекоподобных персонажей принимается общий modular low-poly pipeline:

- один общий humanoid skeleton, ориентир 13–17 костей;
- общий набор animation clips;
- modular heads/hair/clothes/headgear/accessories;
- palette-slot recoloring вместо отдельных текстурных вариантов;
- runtime rotation вместо sprite sheets направлений;
- animation pose sampling намеренно ниже render FPS для сохранения pixel-animation характера;
- movement не использует root motion: gameplay position остаётся авторитетной.

Подробный контракт находится в `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`.

### Физика и навигация

3D renderer не становится источником gameplay-физики.

- collision остаётся 2D polygon/shape based;
- NPC routes остаются в logical world coordinates;
- full 3D physics engine не добавляется без отдельного ADR;
- picking может использовать Three.js raycast, но результат всегда возвращает semantic interaction ID.

## Что сохраняется из ADR-0004

ADR-0004 не отменяется полностью. Сохраняются:

- React/Phaser boundary;
- Phaser 4 как основной framework игрового контура;
- WebGL как основной графический backend;
- разделение `map-engine` и игрового мира;
- nearest-neighbor discipline для pixel assets;
- воспроизводимая сборка ресурсов;
- reduced-motion и performance profiles.

Для Hub заменяется только обязательность sprite-first/Tiled-first способа построения визуального мира.

## Почему не Phaser 3D как основной renderer

Phaser 3D/3D World рассматривается как перспективная технология, но на дату решения является слишком новой для того, чтобы делать её единственной production-основой Hub. Для проекта важнее иметь зрелый 3D renderer и возможность независимо развивать pixel pipeline.

После появления достаточного production опыта Phaser 3D может быть повторно рассмотрен отдельным technical spike и ADR.

## Почему не полный Three.js rewrite

Полный отказ от Phaser не нужен. Текущая архитектура уже правильно разделяет React, WorldBridge и world-engine. Полная миграция увеличит стоимость без прямого выигрыша для пользовательского сценария.

## Почему не 3D → prerendered sprites

Такой подход возвращает комбинаторный рост: направления × кадры × одежда × сезон × состояние. Он допускается только для отдельных декоративных случаев, но не как основной production pipeline Hub.

## Последствия

### Положительные

- сезон, погода, время суток и progression перестают умножать число полноэкранных/спрайтовых вариантов;
- один персонаж может работать во всех направлениях и состояниях;
- Geometry Lock обеспечивается камерой и world definition, а не совпадением вручную нарисованных картинок;
- procedural/instanced geometry уменьшает стоимость производства мира;
- renderer можно заменить независимо от gameplay state и React UI;
- визуальный стиль контролируется централизованным shader pipeline.

### Отрицательные и стоимость

- появляется Three.js dependency и второй графический слой внутри `world-engine`;
- нужен минимальный 3D art/GLB pipeline для персонажей и сложных props;
- pixel post-processing требуется настроить и визуально принять до массовой миграции;
- WebGL context loss, resize и device performance требуют отдельного тестирования;
- некоторое время будут существовать legacy 2D и новый renderer параллельно.

## Условие продолжения миграции

Массовая конверсия Hub разрешена только после vertical slice, который одновременно доказывает:

1. совпадение Geometry Lock на 640×360;
2. стабильный pixel style;
3. день/ночь, дождь и снег без отдельных полноэкранных изображений;
4. один animated character с `idle`/`walk`;
5. building picking;
6. сохранение WorldBridge behaviour;
7. целевые performance budgets.

Если vertical slice не проходит visual acceptance, сначала меняется renderer/shader pipeline, а не производится полный комплект 3D-контента.

## Связанные материалы

- `docs/decisions/ADR-0004-phaser-webgl-pixel-asset-pipeline.md`
- `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`
- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`
- `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md`
- `docs/roadmap/HUB_2_5D_MIGRATION.md`
