# Делегирование работ по перегенерации графики

Этот файл — handoff matrix по существующим агентам из `agents/registry.yaml`. Он не означает, что агент уже выполнял задачу: факт исполнения подтверждается commit/PR/review/log.

## ART-GEN-00 — Gold set и фиксация visual baseline

**Implementation owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, затем `art-director`; technical consult — `pixel-asset-pipeline-engineer`.

Выполнить `BATCH-00-GOLD-SET.md` как 10 последовательных генераций. Не массовить следующие batches до PASS. Зафиксировать accepted outputs как editable `.aseprite`, semantic manifests и art review evidence.

DoD:
- приняты 00-01…00-10;
- 00-02 — immutable inventory-avatar silhouette template;
- 00-03 — immutable mentor identity master;
- 00-10 — immutable Hub geometry master;
- alpha/pivot/grid записаны в manifests.

## ART-GEN-01 — Avatar upper layers

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`; integration reviewer — `identity-avatar-engineer`.

Выполнить `BATCH-01-AVATAR-UPPER.md`. Каждый job должен использовать 00-02 как reference. Если изменён базовый силуэт, candidate reject.

## ART-GEN-02 — Avatar lower/gear layers

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`, `identity-avatar-engineer`.

Выполнить `BATCH-02-AVATAR-LOWER-GEAR.md`; backpacks split into back/front-strap source layers after selection.

## ART-GEN-03 — Held items, badges, companions

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`.

Выполнить `BATCH-03-HELD-BADGES-COMPANIONS.md`; player overlays use 00-02, companion animation poses use accepted companion identity masters.

## ART-GEN-04 — Inventory icon family

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`, `ui-pixel-designer`.

Выполнить `BATCH-04-INVENTORY-TOOLS.md`; 128 masters cleaned manually, 64/32 derivatives built by pipeline.

## ART-GEN-05 — Hub layers and ambient population

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`, `living-world-engineer`, `game-runtime-webgl-engineer`.

Выполнить `BATCH-05-HUB-LAYERS.md` only after accepted 00-10. Full-canvas foreground occluders preserve scene origin. Buildings are not independently re-imagined unless animation/state demands it.

## ART-GEN-06 — Shift/Blitz workspace and mentor expressions

**Owner:** `pixel-asset-designer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`, `ux-accessibility-reviewer`.

Выполнить `BATCH-06-SHIFT-WORKSPACE.md`. 06-02…06-05 are edits of 00-03. Runtime task board remains DOM/SVG/Canvas.

## ART-GEN-07 — UI icon family

**Owner:** `ui-pixel-designer`  
**Reviewers:** `art-director`, `ux-accessibility-reviewer`, `web-performance-engineer`.

Выполнить `BATCH-07-UI-ICONS.md`. Icons are transparent masters, not precomposed buttons.

## AVATAR-RUNTIME-01 — Удалить procedural character art из `AvatarPreview`

**Owner:** `identity-avatar-engineer`  
**Reviewers:** `pixel-art-quality-reviewer`, `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer`, `ux-accessibility-reviewer`.

Problem evidence: `apps/web/src/features/avatar/AvatarPreview.tsx` currently draws the avatar with many hard-coded `fillRect()` calls on a 32×48 canvas. `drawImage()` is absent; therefore generated/approved wearable art is not the canonical visual source.

Required change:
1. renderer reads semantic avatar asset IDs from manifest/AssetPack;
2. layers use one common canvas/pivot;
3. direction/animation use authored frames/tags;
4. `ctx.imageSmoothingEnabled = false` remains enforced;
5. inventory avatar uses dedicated richer class; world avatar uses 32×48 family;
6. procedural backdrop is removed from avatar sprite renderer and becomes a separate scene/background asset;
7. no hard-coded atlas coordinates in product state.

## ASSET-PIPELINE-01 — ChatGPT candidate intake and QA

**Owner:** `pixel-asset-pipeline-engineer`  
**Reviewers:** `integration-release-engineer`, `web-performance-engineer`, `art-director`.

Implement candidate intake contract:

- source candidate folder isolated from approved source;
- PNG alpha validation for isolated assets;
- detect missing transparent border / fully opaque output where alpha required;
- final size/pivot/world-layer manifest validation;
- source provenance fields for ChatGPT image generation;
- no `candidate_*` path reachable from runtime AssetPack;
- deterministic derivatives 128→64→32 only after pixel cleanup;
- sprite sheet generation from Aseprite frames/tags, never from AI contact sheet.

## RUNTIME-WORLD-01 — Layer/depth integration

**Owner:** `game-runtime-webgl-engineer`  
**Reviewers:** `web-performance-engineer`, `art-director`, `integration-release-engineer`.

Implement the layer order described in `README.md`: geometry master → weather → world behind → foreground occluder → world front → interaction masks → React UI. Nearest-neighbour sampling and deterministic scene origin required.

## Reviewer sequence

1. `pixel-art-quality-reviewer`: technical pixel-art gate.
2. `art-director`: visual/art-direction gate.
3. class-specific runtime/UI reviewer.
4. `integration-release-engineer`: pack/build/release gate when runtime integration changes.

Self-approval is forbidden by repository policy.
