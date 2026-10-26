# Skill — Pixel-art Direction & Asset Production

Use for screens, characters, props, world layers, inventory and effects.

Read:
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/design/LIVING_WORLD_SYSTEM.md`
- `design/pixel-art/README.md`
- `assets/README.md`
- `config/art-toolchain.yaml`
- `agents/roles/art-director.md`
- `agents/roles/pixel-asset-designer.md`
- `agents/roles/pixel-asset-pipeline-engineer.md`

Procedure:
1. Identify scene purpose and primary information hierarchy.
2. Select palette/token roles; reserve `meteo.*` semantics.
3. Define stable asset ID, logical pixel size, pivot, layers, animation states and responsive scaling.
4. Separate base sprite from time-of-day lighting/masks where possible.
5. Produce reusable sprite/tile/component assets, not a flattened screenshot; production source belongs in `assets/source`.
6. Validate against Hub/Blitz/Duel/Inventory/Tournament/Progression references.
7. Hand source + manifest requirements to `pixel-asset-pipeline-engineer`; never manually patch `assets/generated`.
8. Route animated/heavy assets to Web Performance and final visuals to Art Director.

Deliver editable source, asset manifest intent plus visual acceptance notes.
