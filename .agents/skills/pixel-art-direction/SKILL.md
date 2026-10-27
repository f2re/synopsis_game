---
name: pixel-art-direction
description: Pixel-art direction and asset production procedures for screens, portraits, characters, props, world layers, inventory and effects.
---

# Skill — Pixel-art Direction & Asset Production

Use for screens, portraits, characters, props, world layers, inventory and effects.

Read:
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
- `docs/design/PORTRAIT_ART_DIRECTION.md`
- `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/design/LIVING_WORLD_SYSTEM.md`
- `docs/lore/lore-registry.yaml`
- `config/art-generation-profiles.json`
- `assets/README.md`
- `agents/roles/art-director.md`
- `agents/roles/pixel-asset-designer.md`
- `agents/roles/pixel-asset-pipeline-engineer.md`

Procedure:
1. Identify scene purpose and asset class before choosing pixel scale.
2. Never apply the 32×48 chunky world-sprite language to dialogue portraits.
3. Use `dialogue_portrait` for key NPC closeups: 256×320 logical px, fine pixel clusters, expressive adult face, 48–96 typical colors and no strict quantization.
4. Use `profile_portrait` for compact UI portraits: 160×160 with its own composition.
5. Use `world_character` only for 32×48 in-world sprites, where chunky clusters are appropriate.
6. For adult NPC portraits reject chibi/kawaii/toy proportions, oversized eyes/head/glasses and symbolic two-pixel expressions.
7. Portraits must preserve readable eyes, nose, mouth, jaw, age, gaze, hair identity and micro-expression at native size.
8. Generate 6 candidates for major dialogue portraits and select before refinement.
9. Compare selected raw and refined; reject refinement if it coarsens the face or removes expression.
10. For architecture/scenes apply their own class profiles instead of portrait rules.
11. Define stable asset ID, logical size, pivot, layers, states and responsive scaling.
12. Separate base geometry from time-of-day lighting/masks where possible.
13. Hand manifest/technical requirements to `pixel-asset-pipeline-engineer`; technical PASS never substitutes for art acceptance.

Deliver editable source, manifest intent, native-size preview, enlarged technical previews and visual acceptance notes. The first question for a portrait is «похож ли он на живого конкретного человека?», not «достаточно ли он пиксельный?».
