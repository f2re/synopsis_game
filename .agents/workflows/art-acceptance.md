# Workflow — Art / Living World Acceptance

1. Load fixed references from `design/pixel-art/`, the design specifications and `docs/design/HUB_VISUAL_ACCEPTANCE.md`.
2. `art-director` defines/validates composition, palette tokens, sprite scale, world-location/solar phase mapping and scene density.
3. `pixel-asset-designer` or feature engineer produces reusable layered assets/components from the approved master composition.
4. Recompose the static layers and compare the result with the master at the same resolution. Unmasked differences are blocking.
5. `web-performance-engineer` checks the implementation budget and fullscreen `cover` behavior in representative desktop/mobile viewports.
6. `ux-accessibility-reviewer` checks task hierarchy, responsive/projector behavior and reduced-motion.
7. Record `ART_ACCEPTED` only if all blocking findings are resolved.

A static concept image can be a reference but is not sufficient implementation evidence. Production work must decompose it into reusable sprites/layers/components while preserving the approved composition.

## Blocking conditions

`ART_ACCEPTED` MUST NOT be issued when any of the following is true:

- the user-facing Hub is rendered primarily with `Phaser.Graphics` primitives or other schematic placeholders;
- the game is embedded in a fixed-width prototype card instead of filling the browser viewport;
- only a low-resolution documentation preview is available instead of a high-resolution master;
- the composed scene no longer matches the approved main-screen reference;
- location labels or debug overlays obscure the architecture more than in the approved composition.
