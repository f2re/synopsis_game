# Игровой runtime, WebGL и графические ресурсы

**Статус:** принято

## Runtime boundary

```text
React application
├── DOM/CSS UI
├── map-engine (SVG/Canvas; meteorological geometry)
└── GameWorld mount
    └── @synopsis/world-engine
        └── Phaser 4 / WebGL
```

Phaser is not the application shell. It is the game-world renderer and animation runtime.

## World rendering layers

`L0 sky/stars → L1 clouds/sun/moon → L2 distant terrain/city → L3 campus architecture → L4 vegetation/lights/flags → L5 NPC/fauna → L6 interactables → L7 DOM/UI boundary → L8 short feedback FX`.

`world-engine` receives world state and deterministic seeds. Frame-level animation remains local. Server state never streams every bird coordinate each frame.

## Asset flow

```text
Aseprite / Pixelorama
        ↓
assets/source + assets/manifests
        ↓
sprite-tools: lint / tags / pivots / bounds / palette / atlas metadata
        ↓
Tiled JSON scene references stable asset IDs
        ↓
AssetPack optimisation
        ↓
assets/generated
        ↓
Phaser loader/runtime
```

## Pixel rendering contract

- nearest-neighbour sampling for pixel textures;
- no accidental smoothing during resize;
- sprite animation cadence is independent from display FPS;
- movement/tween/camera may run at display cadence while sprite frames remain intentionally low-frequency;
- avoid giant prerendered full-screen backgrounds when reusable layers/masks work;
- no uncontrolled per-frame React state;
- shaders/filters are allowed only when they preserve pixel readability and performance budgets;
- reduced-motion and low-power profiles are first-class runtime modes.

## File ownership

- `assets/source`: editable art source;
- `assets/scenes`: Tiled world/room sources;
- `assets/manifests`: semantic metadata/provenance;
- `assets/generated`: build output;
- `tools/assets`: transformation/validation tooling;
- `packages/world-engine`: Phaser/WebGL runtime.

See ADR-0004 and `docs/design/PIXEL_ASSET_PIPELINE.md`.
