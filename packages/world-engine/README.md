# @synopsis/world-engine

Phaser 4/WebGL runtime for the living pixel world. This package owns rendering lifecycle, scene/camera integration, texture sampling, sprite animation playback, tweens, particles, filters/shaders and the React mount boundary.

```text
src/
├── bridge/       # React ↔ Phaser lifecycle/events
├── runtime/      # bootstrap, renderer, scaling, context policy
├── scenes/       # Phaser scenes and composition adapters
│   ├── hub/      # first world map and location states
│   ├── archive/  # first vertical slice
│   └── ui/       # pixel buttons/location markers
├── assets/       # semantic asset-ID/runtime loader adapters
├── systems/      # reusable rendering/animation/interaction primitives
└── diagnostics/  # performance and renderer evidence
```

It does **not** own meteorological truth, match authority, art direction or ambient-event semantics.

Rules:
- Phaser is embedded as a canvas/runtime inside the browser application; React remains responsible for ordinary UI.
- No per-frame React state updates from the game loop.
- Pixel textures use nearest-neighbour sampling and integer-aligned presentation where required.
- Professional meteorological geometry stays in `apps/web/src/features/map` on SVG/Canvas; it is not a separate MVP package.
- Runtime scenes consume semantic asset IDs, not generated atlas coordinates.
- Renderer changes require `game-runtime-webgl-engineer` ownership and `web-performance-engineer` review.

## First implemented slice

The package now contains a 480×270 prototype Hub and Archive flow:

- Archive is the first available location;
- Cartography, Aerology, Radar, Observatory and Tournament are locked with explicit unlock text;
- Archive has the first reusable procedural pixel objects: facade, bookshelves, boxes, catalog cabinet, table, lamp and folders;
- unfinished navigation never fails silently: it reports `В разработке` or the unlock condition;
- procedural geometry is temporary and must later be replaced by canonical `.aseprite` assets without changing semantic IDs.

Run `pnpm world:typecheck` from the repository root after installing the pinned workspace dependencies.

See `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`, `docs/design/locations/ARCHIVE_VERTICAL_SLICE.md` and `docs/decisions/ADR-0005-mvp-modular-monolith-boundaries.md`.
