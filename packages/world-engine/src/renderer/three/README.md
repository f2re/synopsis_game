# Three.js Hub renderer — technical spike

This directory implements the first vertical slice required by ADR-0007.

## Enable

The production/default path is still the legacy renderer.

Use:

```text
?hubRenderer=three2d
```

Return explicitly to the fallback with:

```text
?hubRenderer=legacy2d
```

## Diagnostic switches

```text
?hubRenderer=three2d&hubDebug=1
?hubRenderer=three2d&pixelPalette=0
?hubRenderer=three2d&pixelDither=0
?hubRenderer=three2d&pixelEdges=0
```

These switches exist so Art Direction and Web Performance can inspect the contribution of each pass instead of judging an opaque composite.

## Current spike architecture

```text
Phaser scene lifecycle/input/WorldBridge
            │
            ├── transparent Phaser canvas (UI/dossier/input)
            │
            └── 320×180 Three.js canvas
                    │
                    ├── fixed orthographic projection
                    ├── procedural ground/path/building/tree/avatar
                    ├── toon ramp lighting
                    └── PixelPostPipeline
                           ├── palette quantization
                           ├── Bayer 4×4 dithering
                           └── depth/normal edges
```

The Three.js canvas is CSS-upscaled with nearest-neighbour sampling into the same integer-scaled 640×360 Hub viewport.

A shared Phaser/Three WebGL context is deliberately **not** part of the first spike. It may be evaluated after measurements; renderer ownership and world contracts must not depend on that optimisation.

## Geometry Lock

`HubProjection.logicalToGround()` ray-intersects canonical logical coordinates with the `y=0` ground plane. Any ground anchor produced by this mapping can be projected back to the same 640×360 logical coordinate.

`HUB_WORLD_DEFINITION_V1` is currently marked `migration-baseline`: positions are scaled from the existing 480×270 runtime while the accepted 640×360 Geometry Lock is converted into authoritative runtime data.

Do not treat `migration-baseline` as final art-direction geometry.

## POC acceptance

Do not expand to full-campus modelling until all are true:

1. CI/typecheck/build are green;
2. ground anchors preserve Geometry Lock;
3. Art Direction accepts the style with pass-by-pass screenshots;
4. Web Performance accepts the vertical-slice budget;
5. legacy renderer remains functional.

See `agents/tasks/HUB_2_5D_POC.md` and `docs/roadmap/HUB_2_5D_MIGRATION.md`.
