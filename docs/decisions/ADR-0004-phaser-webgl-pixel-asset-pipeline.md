# ADR-0004: Phaser 4, WebGL runtime and pixel-asset pipeline

**Status:** accepted

## Decision

The browser game runtime for the living world is Phaser 4, pinned initially to `4.2.1`, embedded inside the React application. Phaser owns world rendering/game-loop concerns; React owns ordinary application UI. The meteorological `map-engine` remains separate on SVG/Canvas and is not migrated into Phaser merely for visual consistency.

Production pixel assets use Aseprite as the primary editor, Pixelorama as an open-source alternative, Tiled JSON as the canonical world-scene format, `@trebeljahr/sprite-tools` for sprite inspection/metadata/transforms and PixiJS AssetPack for web optimisation. Exact accepted versions and upgrade policy live in `config/art-toolchain.yaml`.

## Boundaries

`pixel-asset-designer` creates source art. `pixel-asset-pipeline-engineer` owns deterministic transformation/packing. `game-runtime-webgl-engineer` owns Phaser/WebGL runtime integration. `living-world-engineer` owns world state and ambient behaviour. `web-performance-engineer` independently reviews budgets and degradation.

Generated assets are never manually edited. A Phaser major upgrade requires explicit review/ADR because rendering semantics and APIs may change.

## Consequences

We gain a reproducible source→atlas→runtime path, a clear renderer owner, and a stable separation between decorative game rendering and professional meteorological geometry. We accept an additional asset-build step and explicit tool version management.
