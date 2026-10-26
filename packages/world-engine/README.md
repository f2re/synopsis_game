# @synopsis/world-engine

Phaser 4/WebGL runtime for the living pixel world. This package owns rendering lifecycle, scene/camera integration, texture sampling, sprite animation playback, tweens, particles, filters/shaders and the React mount boundary.

```text
src/
├── bridge/       # React ↔ Phaser lifecycle/events
├── runtime/      # bootstrap, renderer, scaling, context policy
├── scenes/       # Phaser scenes and composition adapters
├── assets/       # semantic asset-ID/runtime loader adapters
├── systems/      # reusable rendering/animation/interaction primitives
└── diagnostics/  # performance and renderer evidence
```

It does **not** own meteorological truth, match authority, art direction or ambient-event semantics.

Rules:
- Phaser is embedded as a canvas/runtime inside the browser application; React remains responsible for ordinary UI.
- No per-frame React state updates from the game loop.
- Pixel textures use nearest-neighbour sampling and integer-aligned presentation where required.
- `map-engine` remains a separate SVG/Canvas domain for professional meteorological geometry.
- Runtime scenes consume semantic asset IDs, not generated atlas coordinates.
- Renderer changes require `game-runtime-webgl-engineer` ownership and `web-performance-engineer` review.

See `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`.
