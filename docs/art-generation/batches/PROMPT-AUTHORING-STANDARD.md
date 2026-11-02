# Prompt Authoring Standard — non-degrading production jobs

Status: **MANDATORY** for every new or revised image-generation job in `docs/art-generation/batches/`.

The purpose of this contract is to prevent prompt degeneration. A numbered JOB must carry all subject-specific information needed to preserve identity, geometry and output semantics. A small set of universal mechanical invariants may be inherited from the batch-level `Shared constants` / execution envelope, which is considered automatically prepended when the JOB is executed.

## 1. Core rule

A production JOB is not a title plus one sentence. Every JOB must contain enough information to preserve:

- identity / source reference;
- exact camera and geometry where relevant;
- output canvas and alpha policy;
- semantic layer role;
- pixel-art rendering language;
- lighting/palette relationship;
- explicit task-specific forbidden changes;
- acceptance/failure conditions.

The batch-level execution envelope may centralize only universal mechanics such as:

- `one JOB = one image`;
- no contact sheet / sprite sheet / grid / collage / multiple variants;
- canonical full-scene `640×360`, origin `(0,0)`, never trim;
- shared geometry authority name;
- shared style authority name.

These inherited rules are part of the execution prompt and must be prepended by the operator/runner when sending a JOB. Subject-specific constraints may **not** be moved out of the JOB to make it shorter.

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
- exactly one semantic output/state;
- exact canvas size or sprite logical size;
- transparent RGBA or opaque / QA composite policy;
- trim policy where relevant;
- origin/pivot/anchor where asset-local rather than inherited;
- semantic layer;
- whether the result is a full-canvas overlay, isolated sprite, edit state or QA composite/reference.

Markdown emphasis is allowed: `Exactly **ONE**` is semantically identical to `Exactly ONE`.

For full-scene Hub batches, `(0,0)`/never-trim may be inherited from a canonical `Shared constants` block if that block explicitly states the rule. Isolated-sprite pivots/anchors remain local to the JOB because they vary by asset.

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

For QA jobs whose purpose is explicitly to assemble already-approved layers, the heading `Generation/compositing prompt` is also valid. It must still be complete and independently actionable together with the inherited execution envelope.

### `Hard negatives`
At minimum provide the task-specific negatives that prevent semantic or visual drift, for example:
- extra objects not requested;
- text/UI unless explicitly required;
- geometry/camera/identity drift;
- scientifically wrong or stylistically wrong forms;
- smooth vector edges / painterly blur / photorealism where relevant;
- fake transparency / checkerboard background where relevant.

The universal anti-multiple-output block may be inherited from the batch execution envelope to avoid hundreds of inconsistent copies, but a JOB should repeat it when there is elevated risk of the generator returning multiple frames/options.

### `PASS / FAIL`
List measurable rejection criteria. Examples:
- pivot shift > 1 logical px = FAIL;
- architecture outside requested region appears = FAIL;
- fully opaque background on isolated sprite = FAIL;
- identity changes between animation frames = FAIL;
- any readable fake meteorological data = FAIL.

## 3. Canonical execution envelope

When executing any v2 JOB, the effective prompt is:

```text
[BATCH Shared constants / execution envelope]
+
[complete numbered JOB block]
```

The operator/agent must not copy only the Generation-prompt paragraph. The whole JOB block is required, and any declared `Shared constants` block is prepended automatically.

For ChatGPT Images the effective envelope must contain the semantic equivalent of:

> Output exactly ONE image containing exactly the requested state/asset. Do not create a contact sheet, sprite sheet, grid, collage, comparison board, multiple options, alternate views, before/after layout or additional variants. If transparency is required, use real alpha transparency; do not draw a checkerboard pattern.

This architecture keeps the anti-lazy constraint mandatory without forcing each JOB to carry an ever-diverging copy of identical boilerplate.

## 4. Hub geometry contract

For Hub full-scene work:

- canonical logical canvas: `640×360`;
- origin: `(0,0)`;
- geometry authority: `hub.geometry.lock_v1`;
- all full-scene edit layers use full `640×360` canvas and are **never trimmed**;
- camera, horizon, architecture positions, paths, plaza, waterline and major vegetation anchors are immutable;
- runtime fullscreen uses uniform `cover`, never independent X/Y stretch;
- no job may “improve composition” by moving a building.

If only a local element changes, every non-changing pixel must remain transparent in the returned overlay. A canonical batch-level alignment rule may supply `(0,0)`/never-trim for every full-scene JOB in that file; the individual JOB must still declare its own size/output role.

## 5. Animation contract

For authored animation states:

- generate one frame/state per request;
- never ask ChatGPT Images for a finished sprite sheet;
- frame B/C must be edits of accepted frame/master, not a new independent interpretation;
- canvas, pivot, baseline, silhouette scale and fixed support geometry remain constant;
- only the described moving component may change;
- sprite-sheet assembly happens later in Aseprite/pipeline.

## 6. Seasonal/weather/day-phase contract

These are state layers, not new scenes.

Always reference:

> Image A is the accepted `hub.geometry.lock_v1` and is authoritative for camera, horizon, architecture, terrain and object coordinates. Do not redesign or regenerate the Hub. Generate only the requested state layer/edit.

Season changes vegetation/snow/material state. Weather changes particles/wetness/cloud/fog/illumination. Day phase changes sky/light/window/lamp state. None may move architecture.

## 7. Pixel-art language

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

## 8. Minimum prompt depth

A production JOB should normally be at least 700 characters of meaningful subject-specific prompt/constraint text once `References`, `Output contract`, `Generation prompt` (or QA `Generation/compositing prompt`), `Hard negatives`, and `PASS / FAIL` are combined. The inherited execution envelope does **not** excuse a short or vague JOB. Shorter jobs require a documented reason.

QA/orchestration documents that do not call an image generator are exempt, but must say explicitly `TYPE: QA/ORCHESTRATION — NOT AN IMAGE GENERATION PROMPT`.

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
