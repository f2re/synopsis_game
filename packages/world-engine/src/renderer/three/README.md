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

Pixel-pipeline isolation:

```text
?hubRenderer=three2d&hubDebug=1
?hubRenderer=three2d&pixelPalette=0
?hubRenderer=three2d&pixelDither=1
?hubRenderer=three2d&pixelEdges=0
?hubRenderer=three2d&pixelOutlineStrength=0.15
?hubRenderer=three2d&pixelOutlineStrength=0.75
?hubRenderer=three2d&pixelDither=1&pixelDitherStrength=0.05
```

The pixel post pipeline accepts bounded diagnostic uniforms: `pixelOutlineStrength` from 0 to 0.75 (default 0.52) and `pixelDitherStrength` from 0 to 0.05 (default 0.028). Nonfinite or nonnumeric values restore the default; strength values outside bounds clamp. The controls change only the final shader, never camera, meshes, paths, user interaction or the accepted Geometry Lock. Pixel settings are covered by pure Node unit tests and three additional visual-smoke comparisons.

Bayer dithering is intentionally **off by default** after visual comparison showed checkerboard noise on large Hub surfaces. `pixelDither=1` keeps it available as a controlled style experiment.

Deterministic world-state overrides for screenshots and review:

```text
?hubPhase=day
?hubPhase=night
?hubSeason=summer
?hubSeason=winter
?hubWeather=clear
?hubWeather=rain
?hubWeather=snow
?hubWeather=fog
```

The visual-state query controls work for both legacy and Three Hub paths. They are diagnostic overrides only; normal server/world-state authority is unchanged.

## Real-device performance probe

Use:

```text
?hubRenderer=three2d&hubPerf=1
```

The probe is installed before Three.js creates its WebGL context. It keeps a rolling 240-frame window and publishes:

- Three renderer/update CPU wall time: mean, p50, p95, max;
- Phaser frame delta: mean, p50, p95, max;
- WebGL draw calls per frame: mean, p50, p95, max;
- estimated rendered triangles per frame: mean, p50, p95, max;
- live WebGL buffers, textures, programs, framebuffers and VAOs;
- fixed internal renderer resolution (`320×180`).

The current snapshot is available in DevTools as:

```js
window.__SYNOPSIS_HUB_PERF__
```

A compact overlay shows the same rolling values while the query flag is active. The probe deliberately does **not** claim GPU time. GPU time, GPU memory and thermal behaviour still require target-device/browser tooling and remain part of the independent Web Performance gate.

## Automated visual smoke

`.github/workflows/hub-visual-smoke.yml` builds the production web client and captures a fixed 1280×720 matrix with headless Chrome:

- legacy day/clear;
- Three day/clear;
- Three night/clear;
- Three rain;
- Three winter/snow;
- Three fog;
- palette disabled;
- dithering enabled;
- edges disabled;
- outlines at low and high strength;
- dithering at high strength.

The workflow stores PNGs and Chrome logs as a GitHub Actions artifact and fails if required screenshots are absent/suspiciously small or if expected comparison states produce byte-identical PNGs.

Headless SwiftShader evidence is valid for visual/smoke regression. It is **not** a substitute for the real-device GPU-performance gate in `H3D-QA`.

## Current spike architecture

```text
Phaser scene lifecycle/input/WorldBridge
            │
            ├── transparent Phaser canvas
            │      ├── dossier/input
            │      └── renderer-independent progression pins
            │
            └── 320×180 Three.js canvas
                    │
                    ├── fixed orthographic projection
                    ├── accepted 640×360 Geometry Lock v1
                    ├── procedural campus masses/paths/vegetation/avatar
                    ├── toon ramp lighting
                    └── PixelPostPipeline
                           ├── palette quantization
                           ├── optional Bayer 4×4 dithering
                           ├── depth/normal edges
                           └── depth-aware procedural sky grading
```

The Three.js canvas is CSS-upscaled with nearest-neighbour sampling into the same integer-scaled 640×360 Hub viewport.

A shared Phaser/Three WebGL context is deliberately **not** part of the first spike. It may be evaluated after measurements; renderer ownership and world contracts must not depend on that optimisation.

## Geometry Lock

`HUB_WORLD_DEFINITION_V1` represents the accepted `hub.geometry.lock_v1` contract from BATCH-12 directly:

- logical canvas `640×360`;
- horizon `y=92`;
- water band `y=92..147`;
- fixed safe zone `x=48..592, y=42..315`;
- canonical screen regions for Radar, Maps & Analysis, 26063 main operations building, Aerology, Archive, Tournament Hall, Code Post and central globe/plaza.

`HubProjection.logicalToGround()` ray-intersects canonical logical coordinates with the `y=0` ground plane. `assertRoundTrip()` fails fast if the camera/projection stops mapping semantic anchors back to their exact logical coordinates.

## Progression ownership

Progression state is not a facade/material variant. `HubStageLayer` receives renderer-independent building geometry and draws semantic pins in Phaser. In Three mode the old screen-space dotted ground route is disabled because it would render over 3D facades; a future route, if needed, must be drawn on the Three world plane from the same semantic anchors.

## POC acceptance

Do not expand to full-campus authored 3D assets until all are true:

1. CI/typecheck/build are green;
2. Geometry Lock round-trip is enforced;
3. Art Direction accepts the style using the visual-smoke matrix;
4. Web Performance accepts the vertical-slice budget on target hardware;
5. legacy renderer remains functional;
6. temporary `three-poc.d.ts` is replaced by maintained typings before production default.

See `agents/tasks/HUB_2_5D_POC.md` and `docs/roadmap/HUB_2_5D_MIGRATION.md`.

## Renderer state integrity

`PixelPostPipeline.render()` now restores scene `overrideMaterial`, excluded normal-pass visibility and the prior WebGL render target through `finally`, including if a draw throws. This protects surrounding Phaser/Three scene state; it does **not** implement full WebGL context-loss restoration. Context loss/restore, GPU frame p95 and pixel-style art acceptance remain independent gates (#94 and #93).
