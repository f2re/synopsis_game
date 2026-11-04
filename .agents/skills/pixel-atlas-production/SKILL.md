---
name: pixel-atlas-production
description: "Use for deterministic sprite atlas packing, pixel frame IDs, alpha, pivots, padding, nearest-neighbour sampling and build manifests."
---

# pixel-atlas-production

## When to use

Use for deterministic sprite atlas packing, pixel frame IDs, alpha, pivots, padding, nearest-neighbour sampling and build manifests. For neighboring responsibilities consult `agents/capability-catalog.json` and the source of truth for ownership.

## Procedure

1. Read docs/design/PIXEL_ASSET_PIPELINE.md, tools/assets/README.md, config/art-toolchain.yaml and assets/manifests.
2. Require pixel-art-quality-reviewer craft acceptance before production packing; preserve original editable sprites.
3. Validate frame sizes, animation tags, stable semantic IDs, pivots, palette, transparency and atlas bleeding/padding.
4. Rebuild without hand-editing assets/generated and record atlas dimensions, hashes and visible QA outcome.

## Evidence and acceptance

Provide target branch/SHA, changed assets or code, executed commands, relevant fixtures and test results, reviewer decisions and risks. Follow `AGENTS.md`, `agents/registry.yaml` and accepted ADRs; do not install third-party tools or claim an agent ran without a log. Independent review by pixel-art-quality-reviewer and integration-release-engineer is required where changes touch their domain.
