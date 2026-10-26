---
name: pixel-asset-pipeline
description: Pixel asset pipeline procedures for ASSET-* tasks, sprite validation, atlases, Tiled scenes and generated runtime assets.
---

# Skill — Pixel asset pipeline

Use for `ASSET-*`, sprite validation, atlases, Tiled scenes and generated runtime assets.

Read `config/art-toolchain.yaml`, `docs/design/PIXEL_ASSET_PIPELINE.md`, `docs/design/sprites/GENERATION_SERIES_CONTRACT.md`, `assets/README.md` and `agents/roles/pixel-asset-pipeline-engineer.md`.

## Mandatory generation-series contract

For generated asset queues, enforce `docs/design/sprites/GENERATION_SERIES_CONTRACT.md`:

- one prompt / one `asset_id` = one independent generator call = one independent output image file;
- never combine different `asset_id` values into one collage, contact sheet or generation request;
- multi-view or multi-pose content is allowed in one output only when it is explicitly part of that single asset prompt;
- reset unrelated generation context between assets; carry forward only explicit style locks, canonical geometry, palettes, anchors and approved references;
- if the result belongs to a previous or unrelated prompt, mark it `REJECTED` / `INVALID`, do not count it as completed, and regenerate it in a new call;
- review composites are post-process artifacts and never replace the separately generated source assets.

Procedure: start from editable source; validate manifest/provenance; run sprite-tools lint/metadata; preserve tags/durations/pivots; pack/optimise with AssetPack; verify no bleeding/smoothing; generate rather than hand-edit outputs; record tool versions and reproducibility evidence.