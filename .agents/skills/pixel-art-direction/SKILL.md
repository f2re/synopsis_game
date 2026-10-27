---
name: pixel-art-direction
description: Pixel-art direction and asset production procedures for screens, characters, props, world layers, inventory and effects.
---

# Skill — Pixel-art Direction & Asset Production

Use for screens, characters, props, world layers, inventory and effects.

Read:
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
- `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/design/LIVING_WORLD_SYSTEM.md`
- `docs/design/locations/ARCHIVE_VERTICAL_SLICE.md`
- `docs/lore/lore-registry.yaml`
- `design/pixel-art/README.md`
- `assets/README.md`
- `config/art-toolchain.yaml`
- `agents/roles/art-director.md`
- `agents/roles/pixel-asset-designer.md`
- `agents/roles/pixel-asset-pipeline-engineer.md`

Procedure:
1. Identify scene purpose and information hierarchy.
2. Apply the 480×270 logical world and consistent physical pixel scale; use large readable clusters and no painterly micro-detail.
3. Keep architecture grounded and game-like; reject palace/fantasy/sci-fi drift unless explicitly required.
4. Select palette role, not an arbitrary tiny color limit. Portraits may normally use 24–40 colors, architecture 32–56, full scenes 48–96 when those colors form controlled ramps.
5. For major adult NPCs explicitly reject chibi/kawaii/toy proportions; age, expression and professional identity must read in `1×`.
6. Define stable asset ID, logical size, pivot, layers, states and responsive scaling.
7. Separate base geometry from time-of-day lighting/masks where possible.
8. For local AI generation, create 4 candidates by default (6 for major characters); select before refinement.
9. Compare selected raw and refined; reject refinement if it destroys semantic features or reduces readability.
10. Produce reusable assets/components, not flattened screenshots; source belongs in `assets/source`.
11. Validate visuals against Hub/Blitz/Duel/Inventory/Tournament/Progression references and lore identity.
12. Hand manifest/technical requirements to `pixel-asset-pipeline-engineer`; technical PASS never substitutes for art acceptance.
13. Route heavy animation to Web Performance and final visuals to Art Director.

Deliver editable source, manifest intent, `1×/2×/4×` previews and visual acceptance notes. A concept frame alone is not a finished asset family.
