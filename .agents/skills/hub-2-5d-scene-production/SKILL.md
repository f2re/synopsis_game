---
name: hub-2-5d-scene-production
description: "Use for producing and validating canonical 2.5D Hub procedural geometry, source assets, shader-friendly GLB models, scene recipes and art acceptance before publishing."
---

# Skill: Hub 2.5D scene production

Используй этот skill для задач по моделированию, procedural generation, generated draft meshes, GLB production и visual acceptance нового Three.js Hub.

## 1. Сначала прочитать

Обязательно:

1. `docs/decisions/ADR-0007-threejs-2-5d-pixel-renderer.md`
2. `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`
3. `docs/architecture/HUB_SCENE_RECIPE_CONTRACT.md`
4. `docs/design/PIXEL_3D_STYLE_CONTRACT.md`
5. `docs/design/HUB_VISUAL_ACCEPTANCE.md`
6. `docs/roadmap/HUB_2_5D_MIGRATION.md`
7. `docs/roadmap/HUB_2_5D_SCENE_PRODUCTION_PIPELINE.md`
8. `config/art-toolchain.yaml`

Если задача касается characters, также читать `CHARACTER_2_5D_ANIMATION_CONTRACT.md`.

## 2. Нельзя начинать mass production до gate

Если R1-C/H3D-034 не принят, не создавать пачки buildings/props/characters «на будущее».

До gate допустимы только:

- Style Lab fixture;
- один building proof;
- один tree/shrub proof;
- один humanoid proof;
- 1–3 props для проверки pipeline;
- validation tooling;
- reference experiments.

## 3. Классифицировать задачу

Перед производством определить класс:

### Procedural

Выбирать по умолчанию для terrain, path, simple architecture, windows, doors, roofs, fences, poles, simple lights.

### Reusable GLB

Выбирать для complex silhouette, rigged character, meteo instrument, unique landmark prop.

### Generated draft

Использовать только если generator сокращает работу над unique reusable mesh.

### 2D retained

Использовать для намеренного billboard/decal/small ambience, где mesh не даёт преимущества.

## 4. Geometry authority

Никогда не угадывать layout по красивому reference.

Всегда брать из Geometry Lock / `HubWorldDefinition`:

- camera/framing;
- horizon;
- footprints;
- entrances;
- paths;
- waterline;
- interaction anchors;
- collision/navigation truth.

Generator не имеет права изменять эти значения.

## 5. Reference generation

Если требуется создать visual reference:

- использовать accepted Geometry Lock как Image A;
- сохранять полный 640×360 frame;
- запрещать crop/reframe/zoom/rotation;
- менять только запрошенный visual dimension;
- не запекать runtime Bayer/outline/noise как surface texture;
- один объект/reference task = один смысл;
- для image-to-3D делать isolated object reference, не whole-scene screenshot.

## 6. Generated mesh workflow

Правильный путь:

```text
isolated approved reference
→ generator quarantine output
→ Blender import
→ remove generated cameras/lights
→ inspect silhouette at game scale
→ cleanup topology/detail
→ normalize axes/scale/pivot
→ semantic material slots
→ GLB export
→ glTF Validator
→ glTF Transform inspect
→ project validator
→ Style Lab snapshot
→ approval/registry
```

Никогда не копировать raw generator GLB сразу в approved runtime assets.

## 7. Material rule

Не сохранять generator-specific material naming как контракт.

Перевести материалы в semantic slots, например:

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

Pixel style создаётся shared renderer-ом.

## 8. Target-scale review

Каждый asset проверять не только крупным preview, но в canonical Style Lab:

- internal 320×180;
- output 640×360;
- canonical orthographic camera;
- palette/light/dither/edge passes включены.

Если detail не читается — удалять detail, а не увеличивать texture resolution.

## 9. Environment matrix

Style-critical asset должен быть проверен минимум:

- summer/day/clear;
- summer/night/clear;
- winter/day/snow;
- spring/dusk/rain;
- fog stress case.

Asset не должен требовать отдельного mesh/texture на каждый state, кроме явно документированного silhouette exception.

## 10. Generator selection

Generator — сменный tool adapter.

Перед использованием проверить:

- license/territory;
- version/source;
- output format;
- provenance capability;
- cleanup cost;
- local/offline requirements.

Current research recommendation:

- `TRELLIS.2`: experimental draft adapter candidate;
- `Hunyuan3D 2.x`: disabled by default until license review;
- world generators: research/reference only.

Не добавлять generator stack в browser/runtime dependencies.

## 11. Provenance

Для generated/imported source сохранить:

- asset ID;
- source kind;
- tool/model/version;
- source reference;
- seed if available;
- prompt revision/reference;
- license review state;
- cleanup revision;
- approver/date.

## 12. Git policy

Не смешивать в одном PR без причины:

- renderer infrastructure;
- mass asset production;
- generator experiments;
- unrelated 2D sprite work.

Для visual PR приложить/сгенерировать canonical snapshots и указать:

- geometryLockId;
- recipe/asset revision;
- state matrix covered;
- budget/validator result.

## 13. Stop conditions

Остановиться и поднять architecture/art review, если:

- generator заставляет менять Geometry Lock;
- cleanup generated mesh дороже ручного/procedural варианта;
- style держится только на baked generated texture;
- state change требует re-generation;
- provenance/license нельзя подтвердить;
- model detail не читается на 320×180;
- visual result выглядит как generic low-poly + pixelate filter.

## 14. Definition of Done для отдельного 3D asset

Asset готов только когда:

- имеет stable asset ID;
- имеет approved source/provenance;
- normalized по scale/axes/pivot;
- проходит glTF validation;
- проходит project asset checks;
- material slots semantic;
- не содержит accidental cameras/lights;
- silhouette читается в Style Lab;
- не ломает required state matrix;
- находится в approved registry, а не только в generator output folder.
