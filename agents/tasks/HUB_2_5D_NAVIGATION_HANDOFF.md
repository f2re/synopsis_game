# H3D-036 — Hub navigation and collision handoff

Status: **implementation PR in progress**. This document is an actionable handoff, not a claim that remote agents were launched.

## Dependency chain

1. ADR-0007 / PR #79 -> canonical renderer PR #80.
2. WebGL fallback PR #87 -> this route-navigation PR.
3. Renderer convergence #88 must prevent competing #80/#86 runtimes.
4. Physical collision and ground-footprint approval only after Geometry Lock review; release requires #85 and H3D-034.

## Implementation owner: living-world-engineer (Codex, Gemini fallback)

Scope: `packages/world-engine/src/world/hub/`.

- Own accepted 640×360 route graph, semantic entrances, walkability authority, and navigation tests.
- Current vertical slice (`HubNavigation.ts`) consumes accepted `paths` and computes shortest waypoints with deterministic segment intersections and limited start/end connectors.
- New `HubCollision.ts` validates explicit ground obstacle polygons, deletes blocked route segments, and supports avatar clearance; the accepted water band is active in Three.js routing. **There are no approved ground footprints for the procedural buildings yet.**
- Must add *separately approved* ground `footprints`, walkable polygons, agent radius/clearance, permanent and dynamic obstacles, explicit pedestrian entrances.
- Do **not** use `HubBuildingDefinition.bounds` as collision footprints. Those are 2D projected silhouettes.
- Validate that every entrance can reach the connected path network and that no connector crosses approved blocked polygons.
- Negative cases: disconnected subgraph, invalid/missing entrance, blocked segment, overlaps, routing from inside an occupied building, retarget while walking.
- Avoid making Phaser or Three.js objects the navigation source of truth.

## Renderer integrator: game-runtime-webgl-engineer (Codex, Claude fallback)

Scope: `ThreeHubRenderer.ts`, `HubScene.ts`, WorldBridge.

- Route the 2.5D avatar through the common `planHubRoute` result; never linearly tween across the Hub.
- Require precise start/end and stable movement speed across variable frame delta.
- Keep sprite-scale, animation cadence and procedural 3D node transforms separate from gameplay position.
- Add optional route debug overlay only under a query flag, without contaminating screenshot baseline.
- Make building dossier interaction arrival-aware **only after** UX/progression acceptance. Current click-to-open remains unchanged.
- Prove mount/unmount and WebGL context restoration; preserve legacy2d fallback.

## Independent reviewers (cannot self-approve)

- `web-performance-engineer`: route calculations on low-power hardware, frame p95 during retarget and weather.
- `integration-release-engineer`: `pnpm world:test`, full typecheck/build, visual smoke, and branch-order review.
- `art-director`: Geometry Lock, no pedestrian crossing scenery, appropriate apparent walk motion.
- `ux-accessibility-reviewer`: click interactions and reduced-motion behavior.

## Acceptance contract

- [ ] All canonical locations have paths and a collision-checked entrance.
- [ ] No path segment crosses an occupied footprint; route generation fails safely if unreachable.
- [ ] 3D geometry and camera are unchanged between seasons, day phases and weather.
- [ ] Route time/animation never becomes server-authoritative game state.
- [ ] `pnpm world:test`, TypeScript and full CI green on exact reviewed head.
- [ ] Real-device performance and visual review recorded independently.
- [ ] Legacy2d remains default until #85 and H3D-034 approvals.

## Local smoke

```bash
pnpm world:test
pnpm world:typecheck
pnpm typecheck
pnpm build
```

For visual review: `?hubRenderer=three2d&hubDebug=1`. Click the lab, archive and other buildings and verify the avatar follows approved paths, not the straight line. Existing facility dossier opens on click; arrival gating is not part of this slice.
