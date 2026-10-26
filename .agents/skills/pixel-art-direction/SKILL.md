# Skill — Pixel-art Direction & Asset Production

Use for screens, characters, props, world layers, inventory and effects.

Read:
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/design/LIVING_WORLD_SYSTEM.md`
- `docs/design/locations/ARCHIVE_VERTICAL_SLICE.md` for the current first location slice
- `design/pixel-art/README.md`
- `assets/README.md`
- `config/art-toolchain.yaml`
- `agents/roles/art-director.md`
- `agents/roles/pixel-asset-designer.md`
- `agents/roles/pixel-asset-pipeline-engineer.md`

Procedure:
1. Identify scene purpose and primary information hierarchy.
2. Apply the current 480×270 chunky-pixel baseline: large readable clusters, pastel sky, bright soft greens, warm cream/wood, no painterly micro-detail.
3. Keep central architecture grounded and game-like; reject palace-scale silhouettes and repeated project-title signage.
4. Select palette/token roles; reserve `meteo.*` semantics.
5. Define stable asset ID, logical pixel size, pivot, layers, animation states and responsive scaling.
6. For locations, define `available`, `active`, `locked`, and `disabled` states before decoration. Locked locations must explain their unlock condition.
7. Separate base sprite from time-of-day lighting/masks where possible.
8. Produce reusable sprite/tile/component assets, not a flattened screenshot; production source belongs in `assets/source`.
9. Validate against Hub/Blitz/Duel/Inventory/Tournament/Progression references and the current Archive vertical slice.
10. Hand source + manifest requirements to `pixel-asset-pipeline-engineer`; never manually patch `assets/generated`.
11. Route animated/heavy assets to Web Performance and final visuals to Art Director.

Deliver editable source, asset manifest intent plus visual acceptance notes. A concept frame alone is not a finished asset family.
