# Hub 2.5D renderer contract

**Статус:** принято

**Назначение:** нормативный контракт для нового renderer-а Hub. Документ определяет обязательные границы, данные, технологический стек, бюджеты и критерии приёмки. Если реализация противоречит этому документу, требуется обновление контракта и ADR.

## 1. Цель

Hub должен выглядеть как намеренно стилизованный pixel-art/HD-2D мир, но не зависеть от сотен растровых вариантов одной сцены. Геометрия, взаимодействия и gameplay anchors являются стабильными; сезон, погода, время суток, progression и большая часть ambience вычисляются в runtime.

Главная производственная единица — не PNG-состояние, а `world definition + reusable geometry + material state + animation state`.

## 2. Технологический стек

Обязательная архитектура:

- TypeScript;
- Phaser 4 — scene lifecycle, input, audio, UI/HUD, transitions, integration with `WorldBridge`;
- Three.js — Hub 2.5D rendering;
- WebGL2 — основной 3D backend;
- GLB/glTF — runtime-формат для сложных reusable meshes и skinned characters;
- custom shader/post-processing passes — pixel style;
- Blender — authoring только там, где procedural geometry недостаточна;
- Meshopt-compatible optimisation допускается после измерений.

Версия Three.js должна быть зафиксирована точной версией в workspace lockfile/package manifest после technical spike. Диапазон с неограниченным major/minor обновлением для renderer dependency запрещён.

Phaser 3D не является обязательной dependency этого контракта.

## 3. Границы ответственности

```text
React
  │
WorldBridge / world state
  │
Phaser scene lifecycle
  ├── UI/HUD/audio/input
  └── ThreeHubRenderer
       ├── world geometry
       ├── character renderers
       ├── materials
       ├── lighting
       ├── particles
       ├── picking
       └── pixel pipeline
```

Three.js не владеет:

- серверной истиной;
- progression;
- game rules;
- user inventory semantics;
- 2D collision truth;
- NPC scheduling truth;
- React state;
- meteorological map rendering.

## 4. Logical space и Geometry Lock

### 4.1 Hub logical coordinates

Канон Hub:

```text
width  = 640
height = 360
origin = top-left
```

Все gameplay anchors должны иметь детерминированное соответствие этому пространству.

### 4.2 Internal rendering

Default quality profile:

```text
logical output:   640×360
internal 3D RT:   320×180
pixel scale:      ×2
screen upscale:   nearest-neighbor
```

Допускаются профили 240×135 и 480×270 только после visual/performance проверки. Runtime не должен динамически выбирать произвольный внутренний размер каждый кадр.

### 4.3 Scene-specific viewport

`fitLogicalViewport` или его замена обязаны принимать размеры сцены. Hub использует 640×360. Legacy scenes могут продолжать использовать 480×270 до отдельной миграции.

Запрещено глобально менять все сцены на 640×360 без аудита координат.

### 4.4 Camera contract

Hub использует фиксированную orthographic camera.

Запрещено без отдельного изменения Geometry Lock:

- менять projection type;
- менять horizon;
- свободно вращать camera;
- менять canonical framing;
- re-center/zoom сцену по контенту;
- использовать camera auto-fit по bounding box.

Допустимы поверх canonical framing:

- короткий camera shake;
- scripted pan;
- scripted zoom в пределах согласованного safe range;
- accessibility override без изменения gameplay coordinates.

## 5. `HubWorldDefinition`

Renderer-independent definition является единственным источником spatial semantics.

Минимальный интерфейс:

```ts
export interface HubWorldDefinition {
  version: string;
  logicalSize: { width: 640; height: 360 };
  geometryLockId: string;
  camera: HubCameraDefinition;
  buildings: HubBuildingDefinition[];
  paths: HubPathDefinition[];
  collision: HubCollisionShape[];
  vegetationGroups: HubVegetationGroup[];
  propGroups: HubPropGroup[];
  npcSpawns: HubNpcSpawn[];
  npcRoutes: HubNpcRoute[];
  interactionAnchors: HubInteractionAnchor[];
  environmentAnchors: HubEnvironmentAnchor[];
}
```

Каждый интерактивный объект обязан иметь стабильный semantic ID.

Пример:

```ts
{
  id: 'archive',
  footprint: [...],
  entrance: { x: 314, y: 221 },
  interactionId: 'building.archive',
  facadeKind: 'procedural',
  stateCapabilities: ['locked', 'available', 'active', 'completed']
}
```

Visual mesh UUID не является gameplay ID.

## 6. Geometry production rules

Приоритет способов создания geometry:

1. primitive/procedural geometry;
2. reusable parameterized kit;
3. instanced reusable mesh;
4. GLB asset;
5. raster billboard — только если это намеренный художественный элемент.

### 6.1 Procedural by default

Процедурно строятся, если нет доказанной причины иначе:

- ground;
- paths;
- plaza;
- water plane;
- simple campus buildings;
- roofs;
- windows;
- doors;
- chimneys;
- poles;
- fences;
- basic antennas;
- lights;
- simple furniture/props.

### 6.2 GLB by exception

GLB используется для:

- skinned characters;
- сложных meteo instruments;
- уникальных props со значимой silhouette;
- сложной мебели;
- объектов, где procedural construction дороже reusable mesh.

Запрещено заменять sprite proliferation на GLB proliferation: новый визуальный state не должен автоматически означать новый mesh.

## 7. Material model

Основной стиль не использует PBR как художественную цель.

Базовый material contract:

```ts
interface PixelWorldMaterialState {
  paletteGroup: string;
  lightBands: 3 | 4;
  emissiveLevel: number;
  wetness: number;
  snowResponse: number;
  snowAmount: number;
  windResponse?: number;
}
```

Разрешены vertex colors и small lookup textures. 2K/4K material stacks для стандартного Hub запрещены без отдельного visual justification.

Normal/roughness/metalness textures не являются обязательным pipeline.

## 8. Lighting contract

Цель — дискретное, читаемое освещение, а не реалистичный gradient shading.

Минимум:

- one key directional light or equivalent shader direction;
- ambient/hemisphere contribution;
- 3–4 quantized light bands;
- emissive channel для окон/маяка/сигнальных элементов;
- ограниченное число реальных local lights.

Большинство окон ночью используют emissive, а не отдельный point light.

Shadow policy:

- одна основная shadow source максимум по умолчанию;
- contact shadows персонажей могут быть fake blob/ellipse;
- soft high-resolution cinematic shadows не являются целью.

## 9. Environment state contract

Renderer получает состояние, а не имя готовой картинки.

```ts
interface HubEnvironmentState {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  dayPhase: 'dawn' | 'day' | 'golden' | 'dusk' | 'night';
  weather: 'clear' | 'overcast' | 'rain' | 'snow' | 'fog';
  rainIntensity: number;
  snowIntensity: number;
  snowAmount: number;
  wetness: number;
  fogAmount: number;
  wind: number;
}
```

### 9.1 Snow

Snow accumulation должна вычисляться материалами/world-space masks и небольшим числом additive geometry effects. Separate winter mesh допустим только для структурного изменения silhouette, которое невозможно получить материалом.

### 9.2 Rain

Rain — particles/instancing/GPU points. Wetness — material parameter. Separate wet building textures запрещены как базовый способ.

### 9.3 Fog

Fog — depth/environment effect. Полноэкранный painted fog image не является основой реализации.

### 9.4 Water

Water — один или малое число planes с дешёвым shader: scrolling noise, quantized highlights, ограниченная vertex displacement.

## 10. Vegetation contract

Для Hub достаточно малого reusable library:

- 3–5 deciduous variants;
- 2–3 conifer variants;
- 2–4 shrub variants;
- optional grass/flower clusters.

Повторяющаяся vegetation использует `InstancedMesh` или эквивалент batching.

Сезон меняет:

- palette;
- foliage visibility/density;
- snow response;
- leaf/flower particle state.

Не требуется отдельное дерево на каждый сезон, если silhouette не меняется принципиально.

## 11. Pixel post-processing contract

Порядок обработки фиксирован:

```text
A. geometry + discrete lighting
B. fog/environment
C. render to low-resolution beauty target
D. depth/normal buffers
E. palette quantization
F. ordered Bayer dithering
G. selective depth/normal edges
H. nearest-neighbor upscale
I. Phaser UI/HUD composition
```

### 11.1 Palette

Один canonical `WORLD_PALETTE` или его будущая версия является source of truth. Runtime arbitrary RGB drift между материалами запрещён.

Рекомендуемый бюджет мира: 24–48 базовых цветов до вариаций служебных UI цветов.

### 11.2 Dithering

Default: ordered Bayer 4×4.

Random per-frame noise запрещён, если он создаёт shimmer/flicker. Bayer pattern должен быть screen-space stable либо иметь отдельно проверенную world-space стратегию.

### 11.3 Edges

Edges вычисляются из depth/normal discontinuities. Контур не должен превращать каждую грань в чёрную сетку.

Default thickness: 1 internal pixel при 320×180.

### 11.4 Anti-aliasing

MSAA/FXAA/TAA не должны размывать финальный pixel grid. Любая техника сглаживания допускается только до quantization и только если итоговая pixel readability не ухудшается.

## 12. Interaction and picking

Three.js raycast допускается для screen-to-world picking.

Результат обязан преобразовываться в semantic interaction ID:

```text
mesh hit
→ renderer object metadata
→ interactionId
→ WorldBridge/gameplay event
```

Gameplay code не должен зависеть от mesh UUID, material UUID или scene traversal order.

## 13. Collision and navigation

Collision остаётся 2D.

- building collision: simple polygon/rectangle;
- water: forbidden/walkable polygon;
- paths: logical path graph/polygons;
- NPC movement: logical coordinates;
- no root-motion authority;
- no 3D rigid-body engine by default.

## 14. Asset budgets

Целевой профиль Hub vertical slice:

| Metric | Target |
|---|---:|
| Internal RT | 320×180 |
| Logical output | 640×360 |
| Target FPS desktop | 60 |
| Target FPS mid mobile | 30 minimum / 60 preferred |
| Visible triangles | ≤150k preferred |
| Draw calls | ≤80 preferred, ≤150 hard review threshold |
| Simultaneous animated humanoids | 20–30 |
| Dynamic shadow-casting key lights | 1 default |
| Texture memory Hub | 32–64 MB preferred |
| Full-screen runtime state textures | 0 required |

Порог не является поводом ухудшать арт заранее: сначала измерять, затем оптимизировать.

## 15. Quality profiles

Минимум три профиля:

### `high`
- 320×180 or approved higher internal RT;
- full particles;
- normal/depth edge pass;
- full vegetation density.

### `balanced`
- 320×180;
- reduced particles;
- simplified shadows;
- lower vegetation density.

### `reduced`
- lower internal RT or simplified passes;
- no nonessential particles;
- reduced animation density;
- preserved gameplay readability.

Reduced-motion profile отдельный от performance profile.

## 16. Fallback

Если Three.js/WebGL2 renderer не инициализируется или теряет context и не восстанавливается:

- приложение не должно ломать React UI;
- разрешён legacy Hub renderer во время миграции;
- пользователь должен получить безопасный degraded mode;
- падение renderer не должно терять progression/game state.

## 17. Acceptance criteria

Renderer считается принятым только если:

- canonical screenshot alignment соответствует Geometry Lock 640×360;
- нет reframe между weather/season/day states;
- day/night/rain/snow работают без отдельных full-scene runtime images;
- минимум одно building state меняется runtime parameters;
- building picking возвращает стабильный semantic ID;
- один modular character выполняет `idle` и `walk`;
- character movement совпадает с logical coordinates;
- pixel pipeline не даёт blur/shimmer при движении;
- resize сохраняет aspect ratio и pixel discipline;
- context loss/recovery обработан;
- performance profile проходит defined test devices;
- `WorldBridge` interface не требует покадровой React state synchronization.

## 18. Запрещённые shortcuts

Без отдельного решения запрещены:

- full Hub as one Blender scene as source of gameplay truth;
- free perspective camera;
- baked image per season/weather/day combination;
- one GLB per visual state;
- full 3D physics only for collision convenience;
- unique skeleton for every NPC;
- high-resolution texture-first art pipeline;
- 60 FPS smooth character pose sampling как единственный режим;
- dependence of gameplay IDs on renderer object IDs.

## 19. Связанные документы

- `docs/decisions/ADR-0007-threejs-2-5d-pixel-renderer.md`
- `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md`
- `docs/roadmap/HUB_2_5D_MIGRATION.md`
- `docs/design/HUB_UI_COMPOSITION_CONTRACT.md`
- `docs/design/HUB_VISUAL_ACCEPTANCE.md`
