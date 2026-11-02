# HubSceneRecipe contract

**Статус:** proposed for H3D-027

## 1. Назначение

`HubSceneRecipe` — build-time/runtime-view contract, который описывает, **как собрать visual scene graph из уже авторитетного `HubWorldDefinition`**.

Он не заменяет `HubWorldDefinition` и не становится вторым источником gameplay coordinates.

Разделение ответственности:

```text
HubWorldDefinition
  = где что находится и что это значит для gameplay

HubSceneRecipe
  = каким approved visual kit/variant/material это представить
```

## 2. Инварианты

Recipe обязан:

- ссылаться на конкретный `geometryLockId`;
- ссылаться на canonical `worldDefinitionRef`;
- не содержать альтернативные building footprints, entrances, paths или interaction anchors;
- использовать stable semantic IDs;
- иметь deterministic seed для разрешённых cosmetic choices;
- разрешать воспроизводимую сборку без вызова AI generator в runtime;
- хранить ссылки только на approved assets/asset families;
- отделять spatial truth от visual variant selection.

## 3. Предлагаемый TypeScript shape

```ts
export interface HubSceneRecipe {
  version: string;
  id: string;
  geometryLockId: string;
  worldDefinitionRef: string;
  seed: string;

  cameraPreset: 'hub-canonical-ortho';
  kitVersion: string;

  buildingVisuals: HubBuildingVisualBinding[];
  vegetationVisuals: HubVegetationVisualBinding[];
  propVisuals: HubPropVisualBinding[];
  characterVisuals?: HubCharacterVisualBinding[];

  materialBindings: HubMaterialBinding[];
  environmentDefaults: HubEnvironmentDefaults;

  generationPolicy: HubGenerationPolicy;
  expectedSnapshots: HubExpectedSnapshot[];
}
```

## 4. Building binding

```ts
export interface HubBuildingVisualBinding {
  buildingId: string; // semantic ID from HubWorldDefinition
  factoryId: string;
  variant: string;
  kitParams?: Record<string, number | string | boolean>;
  detailAssetIds?: string[];
}
```

Запрещено добавлять сюда `x/y/z`, footprint или entrance coordinate, если эти данные уже существуют в world definition.

`factoryId` получает canonical spatial definition по `buildingId` и строит visual representation поверх неё.

## 5. Vegetation binding

```ts
export interface HubVegetationVisualBinding {
  groupId: string;
  familyId: string;
  variants: string[];
  deterministicSelection: true;
  densityProfile?: 'full' | 'reduced';
}
```

Конкретный visual variant может выбираться seed-ом. Placement anchors и gameplay-relevant clear zones — нет.

## 6. Prop binding

```ts
export interface HubPropVisualBinding {
  propGroupId: string;
  assetFamilyId: string;
  variants?: string[];
  allowBillboardFallback?: boolean;
}
```

Если prop имеет interaction ID, его semantic anchor приходит из world definition.

## 7. Character visual binding

```ts
export interface HubCharacterVisualBinding {
  npcId: string;
  rigId: string;
  appearanceRecipeId: string;
}
```

Spawn/route/action truth не хранится здесь.

## 8. Material binding

```ts
export interface HubMaterialBinding {
  semanticSlot: string;
  paletteGroup: string;
  lightBands: 3 | 4;
  wetnessResponse: number;
  snowResponse: number;
  emissivePolicy?: string;
}
```

Generated/imported material names сначала нормализуются в semantic slots. Runtime не должен зависеть от названия `Material.001`, `ai_mat_4`, `rough_plaster_02` и т.п.

## 9. Environment defaults

```ts
export interface HubEnvironmentDefaults {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  dayPhase: 'dawn' | 'day' | 'golden' | 'dusk' | 'night';
  weather: 'clear' | 'overcast' | 'rain' | 'snow' | 'fog';
}
```

Это preview/default state, а не сохранённый baked visual state. Runtime world state может менять параметры через существующий environment contract.

## 10. Generation policy

```ts
export interface HubGenerationPolicy {
  allowRuntimeGeneration: false;
  allowDraftMeshGeneration: boolean;
  approvedDraftAdapters: string[];
  requireProvenance: true;
  requireGlbValidation: true;
  requireTargetScaleSnapshot: true;
}
```

AI generation в browser/runtime для canonical Hub запрещена.

## 11. Snapshot expectations

```ts
export interface HubExpectedSnapshot {
  id: string;
  season: string;
  dayPhase: string;
  weather: string;
  outputSize: { width: 640; height: 360 };
  internalSize: { width: 320; height: 180 };
  geometryLockId: string;
}
```

Snapshot hash не должен быть единственным тестом: driver/GPU differences могут требовать perceptual/anchor checks. Geometry Lock anchors при этом проверяются строго.

## 12. Asset registry

Recipe ссылается на stable `assetId`, а не на случайный filepath.

Минимальная build-time запись:

```ts
export interface HubAssetRegistryEntry {
  assetId: string;
  category: 'building-detail' | 'prop' | 'vegetation' | 'character' | 'billboard';
  runtimeUri: string;
  sourceUri?: string;
  sourceKind: 'procedural' | 'hand-authored' | 'generated-draft' | 'retained-2d';
  revision: string;
  provenanceRef?: string;
  approved: boolean;
}
```

Unapproved asset не может собираться production recipe.

## 13. Deterministic seed rules

Seed разрешено применять для:

- visual variant внутри approved family;
- небольшого rotation/scale jitter vegetation в заранее разрешённом диапазоне;
- decorative prop choice;
- ambience placement вне gameplay-critical зон.

Seed запрещено применять для:

- camera;
- horizon;
- building footprints;
- entrances;
- paths;
- waterline;
- collision;
- interaction anchors;
- NPC logical routes.

## 14. Example recipe

```json
{
  "version": "1",
  "id": "hub-style-lab-v1",
  "geometryLockId": "hub.geometry.lock_v1",
  "worldDefinitionRef": "hub-world-v1",
  "seed": "style-lab-001",
  "cameraPreset": "hub-canonical-ortho",
  "kitVersion": "hub-kit-v1",
  "buildingVisuals": [
    {
      "buildingId": "style-lab.building",
      "factoryId": "building.simple-campus",
      "variant": "gable-a"
    }
  ],
  "vegetationVisuals": [
    {
      "groupId": "style-lab.deciduous",
      "familyId": "tree.deciduous.v1",
      "variants": ["a", "b", "c"],
      "deterministicSelection": true
    }
  ],
  "propVisuals": [
    {
      "propGroupId": "style-lab.meteo",
      "assetFamilyId": "meteo.instrument.v1"
    }
  ],
  "materialBindings": [
    {
      "semanticSlot": "architecture.wall",
      "paletteGroup": "architecture.wall",
      "lightBands": 3,
      "wetnessResponse": 0.7,
      "snowResponse": 0.25
    }
  ],
  "environmentDefaults": {
    "season": "summer",
    "dayPhase": "day",
    "weather": "clear"
  },
  "generationPolicy": {
    "allowRuntimeGeneration": false,
    "allowDraftMeshGeneration": true,
    "approvedDraftAdapters": ["trellis2-experimental"],
    "requireProvenance": true,
    "requireGlbValidation": true,
    "requireTargetScaleSnapshot": true
  },
  "expectedSnapshots": [
    {
      "id": "base",
      "season": "summer",
      "dayPhase": "day",
      "weather": "clear",
      "outputSize": { "width": 640, "height": 360 },
      "internalSize": { "width": 320, "height": 180 },
      "geometryLockId": "hub.geometry.lock_v1"
    }
  ]
}
```

## 15. Build algorithm

```text
1. load HubWorldDefinition
2. validate geometryLockId
3. validate recipe schema
4. resolve approved asset registry revisions
5. initialize canonical orthographic camera
6. create procedural authoritative geometry from world definition
7. attach visual kit variants from recipe
8. instantiate approved GLB/billboards
9. bind semantic materials
10. apply environment state
11. run pixel pipeline
12. emit debug anchor overlay + snapshot metadata
```

При ошибке на шагах 2–4 production build должен падать, а не silently fallback на другой asset/random placement.

## 16. Versioning

Breaking changes recipe schema → major version.

Изменение asset revision, которое не меняет semantic contract → registry revision.

Изменение Geometry Lock → новый `geometryLockId` и обязательная повторная visual acceptance.

Изменение seed без gameplay geometry change → visual revision, но canonical snapshots обновляются явно.

## 17. Отношение к Blender scene

`.blend` может быть source-файлом отдельного GLB или Style Lab preview, но **не заменяет recipe/world definition**.

Production должна иметь возможность собрать runtime scene без чтения Blender scene graph как gameplay truth.

## 18. Отношение к генеративным моделям

Generator output не записывает recipe напрямую.

Правильный поток:

```text
generator
→ draft artifact
→ cleanup/normalization
→ approval + registry entry
→ recipe may reference approved assetId
```

Таким образом удаление/замена генератора не ломает already-approved Hub.
