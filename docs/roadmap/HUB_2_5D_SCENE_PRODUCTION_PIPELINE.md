# Production pipeline сцен Hub 2.5D

**Статус:** proposed implementation contract for R0/R1

**Связь:** этот документ дополняет `HUB_2_5D_MIGRATION.md`. При конфликте нормативными остаются `ADR-0007`, `HUB_2_5D_RENDERER_CONTRACT.md`, `PIXEL_3D_STYLE_CONTRACT.md` и Geometry Lock.

## 1. Зачем нужен отдельный production pipeline

Новый Hub нельзя производить ни как набор полноэкранных AI-картинок, ни как одну большую Blender-сцену, ни как коллекцию случайных AI-generated GLB. Требуется воспроизводимый конвейер, в котором:

- spatial truth задаёт `HubWorldDefinition` + Geometry Lock;
- camera/framing не генерируются и не угадываются;
- сцена собирается из procedural/reusable geometry и малого набора GLB;
- художественный стиль формируется в основном единым рабочий контур pixel pipeline;
- генеративные модели используются как source adapters, а не как источник истины;
- любой импортированный mesh проходит одинаковую нормализацию и validation;
- один и тот же world definition детерминированно собирается повторно;
- visual acceptance выполняется на реальном 320×180 internal render, а не по красивому preview из генератора.

Главный принцип:

> **Не генерировать финальный pixel-art вид внутри каждого asset. Генерировать/моделировать читаемую форму, а единый стиль накладывать renderer-ом.**

Это снижает style drift, не привязывает проект к одному генератору и позволяет менять season/weather/day state без повторной генерации сцены.

## 2. Что является source of truth

Порядок авторитета:

1. `hub.geometry.lock_*` — screen-space composition, horizon, footprints, entrances, paths, waterline, safe zones;
2. `HubWorldDefinition` — semantic/spatial data и игровой процесс IDs;
3. `PIXEL_3D_STYLE_CONTRACT.md` — palette/light/dither/edge/motion language;
4. `HubSceneRecipe` — deterministic build recipe конкретного visual assembly;
5. canonical source assets (`.blend`, procedural definitions, approved GLB);
6. generated references/draft meshes;
7. screenshots и mood references.

Ни generated image, ни generated mesh не может переопределять пункты 1–4.

## 3. Четыре класса производственных ресурсов

### A. Procedural / parameterized geometry — default

Используется для:

- ground/terrain;
- coastline/water plane;
- plaza/paths;
- simple building massing;
- roofs;
- windows/doors;
- fences, poles, lamps, simple antennas;
- repeated architecture details.

Плюсы: точное соответствие Geometry Lock, дешёвые варианты, хороший instancing, минимальный drift.

### B. Curated GLB — по необходимости

Используется для:

- character rig;
- сложных метеоприборов;
- уникального prop с важной silhouette;
- дерева/куста, если procedural mass выглядит хуже;
- landmark detail, который рациональнее держать reusable mesh.

### C. Generated draft mesh — только вход в cleanup

AI image-to-3D/text-to-3D допустим для ускорения поиска формы уникального объекта. Результат **никогда не попадает напрямую в рабочий контур**.

Обязательный путь:

```text
reference
→ generated draft mesh
→ import to Blender
→ silhouette review at target scale
→ cleanup/decimate/remesh if needed
→ remove unwanted cameras/lights/material stacks
→ semantic material slots
→ pivot/origin/scale normalization
→ GLB export
→ glTF validation
→ runtime style-lab snapshot
→ approval
```

### D. 2D retained assets

Мелкие ambience elements, decals, billboards и legacy sprites можно сохранять там, где 3D не даёт полезной silhouette/interaction/animation.

Переход на Three.js не означает «всё должно стать mesh».

## 4. Как фактически генерировать сцены

### 4.1 Recommended path: deterministic scene compiler

Полная Hub-сцена **генерируется не diffusion-моделью**, а компилируется из recipe:

```text
Geometry Lock + HubWorldDefinition
       ↓
HubSceneRecipe(seed, kits, variants, semantic material bindings)
       ↓
procedural factories + approved GLB library
       ↓
ThreeHubRenderer scene graph
       ↓
320×180 pixel pipeline
```

Это и есть основной механизм scene generation.

`seed` разрешено использовать только для неавторитетных visual choices: вариант дерева, мелкого prop, cloud placement, decal variant. Seed не может менять footprint, entrance, path, interaction anchor или camera.

### 4.2 Blender procedural compiler

Blender используется как canonical 3D workbench для сложных source assets и для offline generation/preview, но не как игровой процесс database.

Предусмотреть headless script entrypoint уровня:

```text
blender --background hub_style_lab.blend --python tools/art/build_hub_asset.py -- <recipe>
```

Скрипт должен уметь:

- применить unit/orientation convention;
- создать/проверить collections;
- назначить semantic material slots;
- проверить naming/pivots;
- удалить accidental cameras/lights из export set;
- экспортировать GLB;
- записать provenance sidecar.

Фактический implementation entrypoint фиксируется в H3D-задаче и может отличаться по имени.

### 4.3 AI-assisted object generation

Допустимые use cases:

- поиск silhouette уникального meteo instrument;
- стартовая форма дерева/куста;
- landmark prop;
- character accessory без игровой процесс-critical geometry.

Недопустимые use cases:

- генерация whole Hub как одного mesh;
- генерация camera/framing;
- автоматическая расстановка зданий;
- генерация collision/navigation truth;
- baked season/weather state;
- baked pixel dithering/outline в albedo;
- финальная PBR-texture stack как обязательный visual source.

### 4.4 World-generation models

Модели типа text/image-to-world могут использоваться только как R&D/reference source. До появления доказанного способа сохранить Geometry Lock, semantic IDs, budgets и editability их output не является production scene.

## 5. Style Lab — обязательный малый fixture

До массового производства создать `hub-style-lab` с фиксированной камерой и минимумом объектов:

- one simple building;
- one unique prop/meteo instrument;
- one deciduous tree;
- one shrub;
- one humanoid;
- ground/path;
- small water plane;
- one emissive window/sign.

Style Lab должен прогоняться через те же passes, что Hub:

1. low-resolution framebuffer;
2. discrete light bands;
3. palette mapping;
4. Bayer dithering;
5. depth/normal edges;
6. nearest upscale.

Обязательная snapshot matrix:

```text
summer/day/clear
summer/night/clear
autumn/golden/overcast
winter/day/snow
spring/dusk/rain
fog stress case
```

**Production gate:** до принятия Style Lab запрещено массово моделировать/генерировать buildings, characters и props.

## 6. Reference-image generation

Существующий approved Geometry Lock image используется как authoritative Image A.

Reference generation нужна для art direction, а не для рабочий контур compositing.

### 6.1 Base prompt template

```text
Image A is authoritative for geometry and camera. Preserve the full 640×360
composition exactly: horizon, building footprints, rooflines, paths, waterline,
plaza, foreground positions and screen-space scale. Do not crop, reframe, zoom,
rotate, move or redesign scene geometry.

Explore only the requested visual treatment for a 2.5D pixel-art game reference:
strong readable silhouettes, simplified architectural masses, restrained surface
detail, limited material families, discrete light logic, clear entrance/window
rhythm, sparse atmospheric depth. The runtime renderer will perform palette
quantization, ordered dithering and selective edges, so do not bake noisy pixel
patterns or photographic texture detail into surfaces.

No UI, labels or text unless explicitly requested. Full frame only.
```

К нему добавляется только конкретная задача: например `architecture shape language`, `winter material response`, `tree silhouette family`.

### 6.2 Reference-to-3D prompt rule

Для image-to-3D сначала получать изолированный объект на простом фоне/turnaround, а не пытаться восстановить mesh из полного Hub screenshot.

Требования к reference:

- object fully visible;
- no crop;
- minimal occlusion;
- neutral or orthographic-like view where practical;
- no cast shadow fused with object;
- no transparent atmospheric effects;
- one object per generation job.

## 7. Style authority: что НЕ надо запекать в assets

Следующие признаки должны приходить из рабочий контур renderer, а не из генератора:

- 3/4 light bands;
- canonical world palette;
- Bayer 4×4;
- selective depth/normal outlines;
- day/night palette shift;
- wetness;
- snow amount;
- fog depth response;
- final pixel grid.

Asset должен давать renderer-у хорошую геометрию и semantic material family.

Пример material slots:

```text
architecture.wall
architecture.roof
architecture.window
architecture.metal
vegetation.trunk
vegetation.foliage
character.skin
character.cloth.primary
character.cloth.secondary
```

Arbitrary generated RGB/PBR material names не являются контрактом.

## 8. Cleanup contract для imported/generated mesh

Перед approval проверить:

- единицы и scale;
- up/forward axis;
- pivot/origin;
- transforms applied/expected;
- normals;
- manifold/degenerate geometry where relevant;
- hidden duplicate shells;
- unnecessary tiny triangles;
- screen-space silhouette at 320×180;
- material slot count;
- textures and embedded images;
- accidental lights/cameras;
- animations/skeleton only when expected;
- stable semantic name/asset ID.

Для style-critical объекта критерий «выглядит детально в Blender» не имеет значения, если деталь исчезает на target scale.

## 9. GLB validation chain

Минимальная build-chain:

```text
Blender export
→ glTF Validator
→ glTF Transform inspect
→ project-specific asset contract validator
→ runtime load smoke test
→ canonical snapshot
```

`gltf-transform optimize` не запускается вслепую. Сначала `inspect`, затем только измеримые transformations, которые не ломают silhouette/material semantics/animation.

Project validator дополнительно должен проверять то, чего не знает generic glTF validator:

- allowed asset category;
- expected semantic material slots;
- max dimensions/scale class;
- required/forbidden animation clips;
- forbidden cameras/lights;
- texture policy;
- triangle/draw-call budget warning;
- provenance sidecar;
- stable asset ID.

## 10. Provenance

Каждый generated/imported asset получает sidecar/manifest:

```yaml
asset_id: meteo.anemometer.v1
source_kind: generated-draft | hand-authored | procedural | retained-2d
source_tool: trellis2 | blender | other
source_version: ...
source_reference: ...
seed: ...
prompt_revision: ...
license_review: approved | blocked | not-required | pending
cleanup_revision: ...
approved_by: ...
approved_at: ...
```

Секретные API keys/prompts с приватными данными в manifest не сохраняются.

## 11. Tool adapter policy

Генератор считается adapter-ом и не должен проникать в рабочий контур architecture.

Интерфейс на уровне production tooling:

```ts
interface DraftMeshGenerator {
  id: string;
  generate(input: DraftMeshGenerationRequest): Promise<DraftMeshArtifact>;
}
```

Production pipeline получает mesh + metadata, после чего работает одинаково независимо от поставщика.

Любой adapter обязан иметь:

- pinned version/endpoint where possible;
- explicit license review;
- deterministic metadata where provider exposes seed;
- no direct write into approved рабочий контур asset directory;
- quarantine/draft output directory;
- provenance record.

## 12. Рекомендуемые adapters на момент исследования

### TRELLIS.2 — preferred experiment

Причины для первого spike:

- image-to-3D;
- mesh output;
- open repository;
- permissive MIT license у основного проекта;
- отдельные utilities для mesh processing;
- хорошо подходит как draft-source, после чего стиль всё равно задаёт renderer.

Не делать TRELLIS.2 обязательной dependency проекта.

### Hunyuan3D 2.x — optional, license-gated

Технически полезен как image-to-shape/image-to-3D source и умеет GLB/PBR pipeline, но его upstream license имеет дополнительные территориальные/usage условия. Поэтому adapter **disabled by default** до отдельной проверки применимости лицензии для конкретного production context.

PBR texture generation сама по себе проекту не нужна как canonical style; shape-only route обычно полезнее.

### HunyuanWorld / world generators — research only

Подход интересен для concept exploration, но current Hub требует Geometry Lock и semantic editability. Whole-world output не должен становиться source of truth.

## 13. Integration с R0/R1

Scene-production track начинается одновременно с R0, но не производит массовые assets.

### H3D-026 — Style Lab specification

Создать recipe/fixture и список canonical screenshots.

**Done:** fixture описан данными; camera/anchors ссылаются на Geometry Lock.

### H3D-027 — Scene recipe schema

Реализовать `HubSceneRecipe` и schema validation.

**Done:** один recipe повторно собирает идентичную scene graph structure при одинаковом seed.

### H3D-028 — Blender/GLB source convention

Зафиксировать units, axes, naming, collections, pivots, export profile.

**Done:** sample asset экспортируется headless и загружается Three.js без ручного ремонта.

### H3D-029 — GLB validation CLI

Добавить glTF Validator + project checks + `gltf-transform inspect`.

**Done:** intentionally broken fixtures отклоняются CI.

### H3D-030 — Procedural kit proof

Один building + roof + windows + door + path собираются parameterized factories.

**Done:** минимум три визуальных варианта без новых full-building assets.

### H3D-031 — Generated draft adapter spike

Проверить один permissively licensed adapter на 2–3 isolated props.

**Done:** generated draft проходит cleanup до project GLB; direct generator output не используется рабочий контур.

### H3D-032 — Provenance manifest

Добавить metadata schema и обязательную проверку generated/imported assets.

### H3D-033 — Golden style snapshots

Автоматизировать snapshot matrix Style Lab.

**Done:** visual diff/inspection работает на canonical 640×360 output.

### H3D-034 — Production unlock review

Совместная проверка R1-C + Style Lab + asset pipeline.

**Done:** только после этого разрешён mass-production перечень задач для Hub assets.

## 14. Порядок выполнения относительно H3D-001…008

Рекомендуемый critical path:

```text
H3D-001 viewport
→ H3D-002 Geometry Lock manifest/tests
→ H3D-003 ThreeHubRenderer shell
→ H3D-004 orthographic mapping
→ H3D-005 low-res framebuffer
→ H3D-006 palette/light shader
→ H3D-007 dithering
→ H3D-008 depth/normal edges
→ H3D-026 Style Lab
→ H3D-027 recipe schema
→ H3D-028/029 source+validation
→ H3D-030 procedural kit proof
→ H3D-031 generated-draft spike (optional/parallel)
→ H3D-033 snapshots
→ H3D-034 production unlock
```

`H3D-027/028/029` можно частично готовить параллельно H3D-006…008, но art production не разблокируется до R1-C.

## 15. Acceptance gates

### Gate P-A — geometry authority

- camera не дрейфует;
- Geometry Lock anchors совпадают;
- recipe не может переопределять игровой процесс positions генеративными данными.

### Gate P-B — style authority

- asset без baked pixel effects;
- итоговый стиль появляется через canonical shader pipeline;
- generated и hand-authored asset выглядят частью одного мира.

### Gate P-C — reproducibility

- одинаковые recipe + seed + approved asset versions → одинаковая scene graph structure;
- provenance присутствует;
- build не зависит от недоступного SaaS для already-approved assets.

### Gate P-D — рабочий контур suitability

- GLB valid;
- budgets проверены;
- no accidental cameras/lights/material stacks;
- target-scale silhouette читается;
- snapshot matrix не выявляет style drift.

## 16. Stop conditions

Остановить mass production и вернуться к architecture/art review, если:

- получить стиль удаётся только через уникальные baked textures на каждом asset;
- generated meshes требуют больше ручного ремонта, чем simple procedural/hand modeling;
- camera или footprints начинают подгоняться под output генератора;
- один и тот же asset не выдерживает day/night/rain/snow;
- pipeline требует whole-scene regeneration для изменения season/weather;
- license/provenance конкретного генератора нельзя однозначно разрешить;
- target scale скрывает большую часть производимой geometry detail.

## 17. Итоговая production формула

```text
AUTHORITATIVE DATA
Geometry Lock + HubWorldDefinition
        ↓
DETERMINISTIC ASSEMBLY
HubSceneRecipe + procedural kit + approved reusable GLB
        ↓
STYLE
shared materials + light bands + palette + dither + edges
        ↓
STATE
season + weather + day phase + progression
        ↓
ACCEPTANCE
canonical snapshots + performance + interaction tests
```

Именно этот путь должен использоваться для полного Hub после vertical slice. Генеративные модели ускоряют отдельные входные материалы, но не становятся архитектурой игры.
