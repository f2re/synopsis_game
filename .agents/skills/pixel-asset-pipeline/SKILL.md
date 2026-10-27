---
name: pixel-asset-pipeline
description: Pixel asset pipeline procedures for ASSET-* tasks, ComfyUI/MCP candidates, atlases, Tiled scenes and runtime assets.
---

# Skill — Pixel asset pipeline

Use for `ASSET-*`, local AI generation, sprite production, manifests, atlases, Tiled scenes and generated runtime assets.

Read:
- `config/art-toolchain.yaml`;
- `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md`;
- `docs/design/PIXEL_ASSET_PIPELINE.md`;
- `docs/design/sprites/GENERATION_SERIES_CONTRACT.md`;
- `docs/design/sprites/PIXEL_ART_VALIDATION_WORKFLOW.md`;
- `assets/source/CANDIDATE_POLICY.md`;
- `agents/roles/pixel-asset-pipeline-engineer.md`.

## Mandatory generation-series contract

- one prompt / one `asset_id` = one independent generator call = one independent output image file;
- never combine different `asset_id` values into one generation request;
- multi-view/multi-pose is allowed in one output only when explicitly part of that asset spec;
- reset unrelated context between assets;
- review composites are post-process artifacts only.

## Mandatory QA split

Never report a graphic as accepted because width/height, alpha or color count passed.

Use independent fields:

```yaml
art_status: pending | pass | fail
technical_status: pending | pass | fail
production_status: candidate | approved | rejected
```

Technical validation checks manifests, logical size, pivots, frame metadata, provenance and packaging. Artistic acceptance checks silhouette, character/location identity, proportions, readability at `1×`, lore and style.

The removed legacy `tools/validate_pixel_art.py` MUST NOT be recreated as a global artistic gate. Use `python tools/assets/check_asset_contract.py` for the objective repository contract.

## Color policy

Do not enforce `≤16 colors` for portraits or a universal tiny palette. Use class-specific palette families and ranges from `LOCAL_AI_ASSET_PIPELINE_V2.md`.

Typical final ranges:
- portraits: 24–40;
- 32×48 characters: 16–28;
- architecture: 32–56;
- 480×270 scenes: 48–96.

These are guidance plus noise alarms, not artistic pass/fail thresholds. Raw candidates may contain more colors.

## Refinement

Do not use destructive majority downsampling as the main pixelization method. Refinement may clean clusters/outlines, map the palette and align the logical grid, but must preserve face, age, glasses, props and major building silhouettes.

If refined output is worse than raw, mark `REFINEMENT_REJECTED` and retry/refine differently.

## Procedure

1. Load the asset spec and lore context.
2. Select the asset-class workflow.
3. Generate 4 candidates by default (6 for important characters).
4. Rank/select for semantic and artistic quality.
5. Refine only the selected candidate.
6. Review in `1×`, with `2×/4×` previews.
7. Record `art_status`.
8. Run `tools/assets/check_asset_contract.py` / sprite metadata checks for technical acceptance.
9. Promote only after both passes.
10. Pack generated outputs reproducibly; never hand-edit `assets/generated`.
