# @synopsis/world-engine

Phaser 4/WebGL runtime for the living pixel world. This package owns rendering lifecycle, scene/camera integration, texture sampling, sprite animation playback, tweens, particles, filters/shaders and the React mount boundary.

It does **not** own meteorological truth, match authority, art direction or ambient-event semantics.

Rules:
- Phaser is embedded as a canvas/runtime inside the browser application; React remains responsible for ordinary UI.
- No per-frame React state updates from the game loop.
- Pixel textures use nearest-neighbour sampling and integer-aligned presentation where required.
- `map-engine` remains a separate SVG/Canvas domain for professional meteorological geometry.
- Renderer changes require `game-runtime-webgl-engineer` ownership and `web-performance-engineer` review.

See `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`.
