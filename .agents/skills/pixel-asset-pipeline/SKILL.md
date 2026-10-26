---
name: pixel-asset-pipeline
description: Pixel asset pipeline procedures for ASSET-* tasks, sprite validation, atlases, Tiled scenes and generated runtime assets.
---

# Skill — Pixel asset pipeline

Use for `ASSET-*`, sprite validation, atlases, Tiled scenes and generated runtime assets.

Read `config/art-toolchain.yaml`, `docs/design/PIXEL_ASSET_PIPELINE.md`, `assets/README.md` and `agents/roles/pixel-asset-pipeline-engineer.md`.

Procedure: start from editable source; validate manifest/provenance; run sprite-tools lint/metadata; preserve tags/durations/pivots; pack/optimise with AssetPack; verify no bleeding/smoothing; generate rather than hand-edit outputs; record tool versions and reproducibility evidence.
