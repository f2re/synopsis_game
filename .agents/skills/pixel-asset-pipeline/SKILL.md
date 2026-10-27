---
name: pixel-asset-pipeline
description: Pixel asset pipeline procedures for ASSET-* tasks, ComfyUI/MCP candidates, portraits, sprites, atlases, Tiled scenes and runtime assets.
---

# Skill — Pixel asset pipeline

Use for `ASSET-*`, local AI generation, portraits, sprite production, manifests, atlases, Tiled scenes and generated assets.

Read:
- `config/art-toolchain.yaml`;
- `config/art-generation-profiles.json`;
- `docs/design/PORTRAIT_ART_DIRECTION.md`;
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

Before generation, choose the profile from `config/art-generation-profiles.json`.

Character classes are distinct:

```text
dialogue_portrait → 256×320, fine detail
profile_portrait  → 160×160
world_character   → 32×48, chunky gameplay sprite
```

Never route a dialogue portrait through the world-character normalizer.

## QA split

Never report a graphic as accepted because width/height, alpha or color count passed.

Use independent fields:

```yaml
art_status: pending | pass | fail
technical_status: pending | pass | fail
production_status: candidate | approved | rejected
```

Technical validation checks manifests, logical size, pivots, frame metadata, provenance and packaging. Artistic acceptance checks face/character identity, expression, silhouette, lore and style.

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

## Color policy

Do not enforce a universal tiny palette.

Typical final ranges:

- dialogue portrait: 48–96;
- profile portrait: 36–72;
- world character: 16–32;
- architecture: 48–96;
- large scene: 96–192.

These are guidance/noise alarms, not artistic pass/fail thresholds.

## Technical checks

The removed legacy `tools/validate_pixel_art.py` MUST NOT be recreated as a global artistic gate.

Use:

```text
python tools/assets/check_asset_contract.py
python tools/assets/check_generation_profiles.py
```

The second check exists specifically to prevent regression back to tiny 128×128 coarse portraits, strict low-color quantization and majority downsampling.

## Procedure

1. Load asset spec, generation profile and lore context.
2. Generate the profile-specific number of candidates.
3. Rank/select for semantic and artistic quality.
4. Refine only the selected candidate with the class-specific workflow.
5. Compare raw/refined at native size.
6. Record `art_status`.
7. Run technical contract checks.
8. Promote only after both passes.
9. Pack generated outputs reproducibly; never hand-edit `assets/generated`.
