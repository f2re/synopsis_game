---
name: pixel-asset-pipeline
description: Pixel asset pipeline procedures for ASSET-* tasks, ComfyUI/MCP candidates, portraits, sprites, environments, atlases, Tiled scenes and generated assets.
---

# Skill — Pixel asset pipeline

Use for `ASSET-*`, local AI generation, portraits, world sprites, architecture, props, terrain, vegetation, UI, effects, manifests, atlases and generated assets.

Read:
- `config/art-toolchain.yaml`;
- `config/art-generation-profiles.json`;
- `docs/design/PORTRAIT_ART_DIRECTION.md`;
- `docs/design/ENVIRONMENT_ART_DIRECTION.md`;
- `docs/design/SPRITE_CLASS_MATRIX.md`;
- `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md`;
- `docs/design/PIXEL_ASSET_PIPELINE.md`;
- `docs/design/sprites/GENERATION_SERIES_CONTRACT.md`;
- `docs/design/sprites/PIXEL_ART_VALIDATION_WORKFLOW.md`;
- `assets/source/CANDIDATE_POLICY.md`.

## Generation-series contract

- one prompt / one `asset_id` = one independent generator call = one independent output image file;
- never combine different `asset_id` values in one generation request;
- reset unrelated context between assets;
- review composites are post-process artifacts only.

## Asset-class routing

Before generation, choose exactly one profile from `config/art-generation-profiles.json`.

Required classes:

```text
dialogue_portrait
profile_portrait
world_character
companion_sprite
architecture_landmark
architecture_small
interactive_object
prop_sprite
terrain_tile
vegetation_sprite
ui_icon
ui_frame
vfx_small
large_scene
```

Never reuse one workflow for two classes merely because both are pixel art. Their visual jobs differ.

Examples:

```text
dialogue_portrait → living face and expression
world_character   → readable body, clothing and gesture
architecture      → silhouette, material, weather and human scale
prop              → instant recognition, texture and lore
terrain           → material, variation and seam quality
vegetation        → species, season and wind
UI                → semantic clarity and hierarchy
large_scene       → composition, depth, light, weather and lived-in world
```

## QA split

Never report a graphic as accepted because width/height, alpha or color count passed.

Use independent fields:

```yaml
art_status: pending | pass | fail
technical_status: pending | pass | fail
production_status: candidate | approved | rejected
```

Technical validation checks manifests, logical size, pivots, frame metadata, provenance and packaging. Artistic acceptance checks the class-specific `artPriorities`, lore, composition and style.

## Portrait policy

For `dialogue_portrait`:

- generate 6 candidates;
- source master is 256×320 logical px (minimum 192×240);
- use fine clusters and allow controlled 1–2 px facial detail;
- target 48–96 meaningful colors, soft ceiling 128;
- strict quantization is disabled;
- majority downsampling is forbidden;
- chibi/kawaii/toy-like adult characters are blocking failures;
- refined output must preserve eyes, nose, mouth, age, hair, glasses and expression.

If refined is less expressive than raw, mark `REFINEMENT_REJECTED`.

## World-character policy

For `world_character`:

- 32×48 remains the gameplay size, but it is not an excuse for generic mannequins;
- preserve haircut, profession, clothing, posture and characteristic color accents;
- use 24–48 meaningful colors when useful;
- do not derive the sprite by downsampling the dialogue portrait;
- do not force every character into one body template.

## Environment policy

Architecture, props, terrain and vegetation must follow `ENVIRONMENT_ART_DIRECTION.md`.

Required principles:

- materials must remain readable;
- weather and time of day affect color and light;
- lived-in scenes carry human traces;
- architecture is not a large icon;
- props are not generic RPG decoration;
- vegetation is species- and season-aware;
- terrain avoids checkerboard repetition and random micro-noise.

## Color policy

Do not enforce a universal tiny palette. Read the current class range from `config/art-generation-profiles.json`.

Color ranges are guidance and noise alarms, not artistic pass/fail thresholds. Never crush a strong candidate merely to hit a lower count.

## Refinement policy

All classes:

- `majorityDownsample=false`;
- destructive global posterization is forbidden;
- class-specific refinement only;
- raw/refined comparison is mandatory;
- if material, expression, silhouette, light or lore identity becomes weaker, reject the refinement.

## Technical checks

The removed legacy `tools/validate_pixel_art.py` MUST NOT be recreated as a global artistic gate.

Use:

```text
python tools/assets/check_asset_contract.py
python tools/assets/check_generation_profiles.py
```

The generation-profile check prevents regression back to one universal workflow, destructive majority downsampling, collapsed color budgets and mixed asset roles.

## Procedure

1. Load asset spec, class profile and lore context.
2. Compile a class-specific prompt and required/forbidden visual features.
3. Generate the profile-specific number of candidates.
4. Rank/select for semantic and artistic quality.
5. Refine only the selected candidate with its class-specific workflow.
6. Compare raw/refined at native gameplay size.
7. Record `art_status` using class-specific priorities.
8. Run technical contract checks.
9. Promote only after both passes.
10. Pack generated outputs reproducibly; never hand-edit `assets/generated`.
