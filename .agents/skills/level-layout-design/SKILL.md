---
name: level-layout-design
description: "Use for planning Hub location POIs, entrances, accessible player paths and discovery pacing distinct from mesh/collision implementation."
---

# level-layout-design

## When to use

Use for planning Hub location POIs, entrances, accessible player paths and discovery pacing distinct from mesh/collision implementation. For neighboring responsibilities consult `agents/capability-catalog.json` and the source of truth for ownership.

## Procedure

1. Read packages/world-engine/src/scenes/hub/hubLayout.ts, locationRegistry.ts and accepted art/lore design documents.
2. Map where activities appear, their unlocked/locked cues, entrances and reading focus on phone/projector.
3. For experimental H3D identify exact branch, preserve 640x360 Geometry Lock and do not invent missing geometry files on main.
4. Hand semantic layout to world-geometry-specialist for real footprints/collisions and obtain art plus UX review.

## Evidence and acceptance

Provide target branch/SHA, changed assets or code, executed commands, relevant fixtures and test results, reviewer decisions and risks. Follow `AGENTS.md`, `agents/registry.yaml` and accepted ADRs; do not install third-party tools or claim an agent ran without a log. Independent review by living-world-engineer, art-director and ux-accessibility-reviewer is required where changes touch their domain.
