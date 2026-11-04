---
name: hub-nav-geometry
description: "Use for branch-aware 2.5D Hub navigation, ground footprint vs screen bounds, route graph and blocked polygons."
---

# Hub navigation and collision — branch-aware skill

**Precondition:** This is an H3D experimental skill. The accepted production `main` currently has no `HubWorldDefinition.ts`, `HubNavigation.ts`, `HubCollision.ts` or ADR-0007. Before editing, inspect the exact target branch and PR dependency chain (especially #79, #80, #87, #89, #90 and issue #91). If required files are not present in the selected branch, **STOP and report a missing prerequisite**; do not generate invented replacement modules or silently change `main`.

For an H3D branch containing the relevant files, read its ADR-0007, `packages/world-engine/src/world/hub/HubWorldDefinition.ts`, `HubNavigation.ts`, `HubCollision.ts`, and H3D handoff. Follow the versioned 640×360 Geometry Lock. Keep renderer-independent semantic coordinates. Screen/facade silhouettes are never ground collision footprints. Overlay actual ground polygons, water, path polylines, entrance anchors and avatar clearance before rerouting.

Check every accepted building entry, disconnected graph, blocked segment, dynamic obstacle, path retarget and routes from inside an occupied footprint. Do not solve overlaps by silently moving locked architecture or switching the renderer default. Require `art-director` for Geometry Lock decisions, `game-runtime-webgl-engineer` for renderer contract, `web-performance-engineer` and `integration-release-engineer` for independent tests.

Output: branch and commit SHA, map overlay/coordinate evidence, all entrance route test results, known limitations and reviewer verdicts. A branch with no H3D files has **NOT APPLICABLE**, never `PASS`.

Reference (not an executable dependency): https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/level-designer.md
