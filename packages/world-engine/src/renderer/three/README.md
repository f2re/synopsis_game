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
```

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

## G1/G3 — проверка читаемости при трёх разрешениях (только для художественной оценки)

В экспериментальном `three2d` работает диагностический параметр:

```text
?hubRenderer=three2d&hubRenderWidth=320  # по умолчанию, 320×180
?hubRenderer=three2d&hubRenderWidth=480  # кандидат, 480×270
?hubRenderer=three2d&hubRenderWidth=640  # кандидат, 640×360
```

Параметр принимает **только** `320`, `480`, `640`; пустые, повторные и остальные значения безопасно возвращают 320×180. Разрешение выбирается один раз при создании renderer-а и не меняет world-space геометрию, ortho camera 640×360, hit regions или Phaser lifecycle. Постфильтр, depth/normal/beauty render targets используют точно такие же размеры, что и Canvas backing store. Выбор **не включается** в production по умолчанию.

Для проверяемого браузерного кадра запускайте `hub-visual-smoke.yml`; архив содержит три PNG `three-res-320.png`, `three-res-480.png`, `three-res-640.png`. В DevTools Canvas имеет `data-hub-internal-resolution`; `?hubPerf=1` показывает **реальные** внутренние размеры.

**Как оценивать:** все три изображения сравниваются при одинаковом viewport, `hubPhase`, `hubSeason`, `hubWeather`, `hubLayout`, seed и UI. Арт-директор проверяет читаемость окон, лестниц, приборов, людей, кустов, масштаба пиксельных кластеров и контраста, а инженер измеряет CPU frame p95, количество отрисовок и работу на **настоящем GPU**. CI SwiftShader доказывает только работоспособность кадра. Выбирать минимальное разрешение, прошедшее обе независимые приёмки. Само увеличение разрешения **не заменяет** новые фасады, UV/decals, персонажей и авторскую пиксельную графику.

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
- active internal renderer resolution (320×180 / 480×270 / 640×360; default 320×180).

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
- edges disabled.

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
