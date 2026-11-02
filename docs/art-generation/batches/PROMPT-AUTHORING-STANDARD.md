# Prompt Authoring Standard — non-degrading production jobs

Status: **MANDATORY** for every new or revised image-generation job in `docs/art-generation/batches/`.

The purpose of this contract is to prevent prompt degeneration. A numbered JOB must be independently copy-pasteable into ChatGPT Images without requiring the operator to reconstruct missing constraints from another file.

## 1. Core rule

A production JOB is not a title plus one sentence. Every JOB must contain enough information to preserve:

- identity / source reference;
- exact camera and geometry where relevant;
- output canvas and alpha policy;
- semantic layer role;
- pixel-art rendering language;
- lighting/palette relationship;
- explicit forbidden changes;
- one-image-only anti-collage instruction;
- acceptance/failure conditions.

Global batch text may explain context, but **must never be the only place where critical constraints live**.

## 2. Mandatory structure of every image JOB

Each JOB must contain these sections:

### `References`
State exactly which accepted image(s) must be attached and what each reference controls.

Example:
- `Image A = hub.geometry.lock_v1` — authoritative for camera, horizon, object positions and scale.
- `Image B = accepted radar master` — authoritative for local identity, materials and pivot.

Never say only “use the reference”. State what is immutable.

### `Output contract`
Specify:
- exactly ONE image;
- exact canvas size or sprite logical size;
- transparent RGBA or opaque;
- trim policy;
- origin/pivot/anchor;
- semantic layer;
- whether the result is a full-canvas overlay, isolated sprite, edit state or QA composite/reference.

Markdown emphasis is allowed: `Exactly **ONE**` is semantically identical to `Exactly ONE`.

### `Generation prompt`
A complete natural-language prompt. It must describe:
- subject;
- pose/state;
- composition;
- material/form language;
- pixel cluster behaviour;
- palette/lighting relationship;
- relation to the accepted master;
- intended runtime use.

For QA jobs whose purpose is explicitly to assemble already-approved layers, the heading `Generation/compositing prompt` is also valid. It must still be complete and independently actionable.

### `Hard negatives`
At minimum prohibit:
- contact sheet;
- sprite sheet;
- grid/collage/multiple variants or an equivalent explicit multiple-output prohibition;
- extra objects not requested;
- text/UI unless explicitly required;
- geometry/camera/identity drift;
- smooth vector edges / painterly blur / photorealism;
- fake transparency / checkerboard background.

Add task-specific negatives as needed. The validator checks semantic equivalents, not one exact English phrase.

### `PASS / FAIL`
List measurable rejection criteria. Examples:
- pivot shift > 1 logical px = FAIL;
- architecture outside requested region appears = FAIL;
- fully opaque background on isolated sprite = FAIL;
- identity changes between animation frames = FAIL;
- any readable fake meteorological data = FAIL.

## 3. Hub geometry contract

For Hub full-scene work:

- canonical logical canvas: `640×360`;
- origin: `(0,0)`;
- geometry authority: `hub.geometry.lock_v1`;
- all full-scene edit layers use full `640×360` canvas and are **never trimmed**;
- camera, horizon, architecture positions, paths, plaza, waterline and major vegetation anchors are immutable;
- runtime fullscreen uses uniform `cover`, never independent X/Y stretch;
- no job may “improve composition” by moving a building.

If only a local element changes, every non-changing pixel must remain transparent in the returned overlay. A full-scene production JOB must state its alignment locally using `(0,0)`, `origin`, `aligned` or an equivalent explicit phrase; do not rely only on a batch-level paragraph.

## 4. Animation contract

For authored animation states:

- generate one frame/state per request;
- never ask ChatGPT Images for a finished sprite sheet;
- frame B/C must be edits of accepted frame/master, not a new independent interpretation;
- canvas, pivot, baseline, silhouette scale and fixed support geometry remain constant;
- only the described moving component may change;
- sprite-sheet assembly happens later in Aseprite/pipeline.

## 5. Seasonal/weather/day-phase contract

These are state layers, not new scenes.

Always state:

> Image A is the accepted `hub.geometry.lock_v1` and is authoritative for camera, horizon, architecture, terrain and object coordinates. Do not redesign or regenerate the Hub. Generate only the requested state layer/edit.

Season changes vegetation/snow/material state. Weather changes particles/wetness/cloud/fog/illumination. Day phase changes sky/light/window/lamp state. None may move architecture.

## 6. Pixel-art language

Required default language unless the specific asset contract says otherwise:

- modern premium pixel art;
- crisp intentional pixel clusters;
- readable silhouettes and broad material masses;
- controlled selective outlining;
- no random single-pixel confetti;
- no vector-smooth curves;
- no photographic texture;
- no painterly brush smear;
- no post-process blur;
- nearest-neighbour production intent;
- details must survive the declared logical resolution.

Do not blindly impose a fixed color count on every class. Palette complexity depends on asset scale, but palette roles must remain coherent with the accepted Hub/character masters.

## 7. Anti-lazy-generator block

Every numbered generation prompt must include the semantic equivalent of:

> Output exactly ONE image containing exactly the requested state/asset. Do not create a contact sheet, sprite sheet, grid, collage, comparison board, multiple options, alternate views, before/after layout, labels, captions or additional variants. If the requested result is transparent, use real alpha transparency; do not draw a checkerboard pattern.

This rule is intentionally repetitive. Equivalent explicit prohibitions such as “no multi-state comparison”, “no alternate version” or “no multiple views” are acceptable when they clearly prevent multi-output collapse.

## 8. Minimum prompt depth

A production JOB should normally be at least 700 characters of meaningful prompt/constraint text once `References`, `Output contract`, `Generation prompt` (or QA `Generation/compositing prompt`), `Hard negatives`, and `PASS / FAIL` are combined. Shorter jobs require a documented reason.

QA/orchestration jobs that do not call an image generator are exempt, but must say explicitly `TYPE: QA/ORCHESTRATION — NOT AN IMAGE GENERATION PROMPT`.

## 9. Legacy protection

The original high-detail batches `00–04`, `06` and `07` predate this sectioned v2 structure. They are temporarily protected by the CI validator with minimum file/JOB depth and anti-multiple-output checks. They may remain as-is until deliberately migrated, but **must not be shortened**. Any newly created batch or any batch outside that explicit allow-list must use the full v2 structure.

`BATCH-05` and `BATCH-08+` have already migrated to v2 and may not revert to legacy format.

## 10. Review gate

A JOB is not ready merely because Markdown exists. Before execution:

1. `pixel-asset-designer` verifies that the prompt is visually actionable;
2. `pixel-art-quality-reviewer` checks grid/pivot/alpha/cluster constraints;
3. `art-director` checks style and composition intent;
4. full-scene/runtime-sensitive jobs additionally require `pixel-asset-pipeline-engineer` or `game-runtime-webgl-engineer` review as appropriate.

No author self-approves the resulting production asset.
