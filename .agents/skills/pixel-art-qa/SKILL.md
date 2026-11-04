---
name: pixel-art-qa
description: "Independent acceptance of sprite pixel grids, palettes, alpha, pivots and manifests"
---

# pixel-art-qa

Use `config/art-generation-profiles.json`, `docs/design/PIXEL_ART_STYLE_GUIDE.md`, and `tools/assets`. Examine native-resolution sprites, silhouette/value hierarchy, stray pixels, repeated palette roles, nearest-neighbour scaling, alpha halos, pivot consistency, frame registration and transparent margins. Do not impose world-character 32×48 limits on dialogue portraits. Verify one asset_id per independent generation, checksum/provenance and candidate-to-production acceptance. Technical quality and artistic direction are separate verdicts; the producer never self-approves.

Upstream research reference (not a runtime dependency): https://github.com/ProkStudio/skills/blob/9d542f2bc632504082f13d6d6b1508ea65a49f36/skills/game/2d/pixel-art-fundamentals/SKILL.md

Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
