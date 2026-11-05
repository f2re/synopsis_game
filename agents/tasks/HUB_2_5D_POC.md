# HUB 2.5D POC — multi-agent handoff

**Branch:** `feat/hub-three2d-poc`

**Architecture base:** `docs/three2d-renderer-contracts` / PR #79

**Program source:** `docs/roadmap/HUB_2_5D_MIGRATION.md`

## Execution rule

This file records role ownership and required independent reviews. A role listed here is not considered to have executed or approved work until there is a commit, log, issue comment or PR review from that role/provider. The current branch contains implementation work prepared for those reviews; it does not fabricate agent execution evidence.

## Workstream A — renderer / shader spike

**Owner:** `game-runtime-webgl-engineer`

**Tasks:** `H3D-001..H3D-008` / roadmap R0–R2 vertical slice.

Scope:

- scene-specific logical viewport;
- `hubRenderer=legacy2d|three2d` feature flag;
- Three.js renderer shell inside `packages/world-engine`;
- canonical 640×360 → orthographic world projection;
- fixed 320×180 internal framebuffer;
- toon/discrete lighting;
- palette quantization;
- Bayer 4×4 dithering;
- depth/normal edges;
- day/night, rain/snow/fog and season state proof;
- semantic picking and WorldBridge preservation.

Current implementation files:

- `packages/world-engine/src/runtime/fitLogicalViewport.ts`;
- `packages/world-engine/src/runtime/hubRendererMode.ts`;
- `packages/world-engine/src/runtime/createWorldGame.ts`;
- `packages/world-engine/src/renderer/three/**`;
- `packages/world-engine/src/scenes/hub/HubScene.ts`;
- `packages/world-engine/src/scenes/hub/HubDossierLayer.ts`.

Required reviewers:

- `web-performance-engineer` — frame time, GPU/browser budgets, degradation;
- `integration-release-engineer` — install/build/release/regression;
- `art-director` — visual R1-C gate only after runtime correctness.

## Workstream B — semantic world definition and geometry

**Owner:** `living-world-engineer`

**Tasks:** roadmap R3–R4 / `H3D-009..H3D-016`.

Scope after Workstream A gate:

- replace migration-scaled anchors with accepted Geometry Lock values;
- extract one canonical `HubWorldDefinition` for buildings, paths, collision, vegetation groups, props and routes;
- remove duplicated renderer-specific spatial truth;
- implement `BuildingFactory`, `RoofFactory`, `PathFactory`, `TerrainFactory`, `WindowFactory`, `TreeFactory`;
- preserve semantic interaction IDs;
- preserve day/season/weather state as data, not alternate geometry assets.

Required reviewers:

- `game-runtime-webgl-engineer`;
- `art-director`;
- `web-performance-engineer` for instancing/draw-call budgets.

## Workstream C — 2.5D character runtime

**Semantic owner:** `identity-avatar-engineer`

**Renderer co-owner/reviewer:** `game-runtime-webgl-engineer`

**Tasks:** roadmap character stage / `H3D-017..H3D-021`.

Scope:

- canonical 13–17 bone humanoid rig;
- shared idle/walk/run/interact/work/carry/sit/emote clips;
- 8-direction/45° facing quantization where accepted;
- 8–12 FPS pose cadence independent of 60 FPS render cadence;
- modular clothing/headgear/accessories;
- palette slots instead of duplicated texture variants;
- no root-motion gameplay authority;
- interaction sockets for book/radio/clipboard/umbrella/tools.

Required reviewers:

- `art-director` for silhouette/pixel-motion language;
- `web-performance-engineer` for skinned-mesh/animation cost;
- `integration-release-engineer` for GLB/toolchain reproducibility.

## Workstream D — independent acceptance

### `web-performance-engineer`

Evidence required before switching default renderer:

- desktop profile;
- classroom/projector profile;
- mid-range mobile profile;
- FPS/frame-time capture with post passes enabled;
- GPU/texture/resource footprint where measurable;
- resize and DPR behaviour;
- reduced-motion/low-power behaviour;
- context-loss/recovery check.

### `art-director`

Evidence required for R1-C:

- screenshots with palette/dither/edge toggles;
- day/night comparison of the same geometry;
- rain/snow/fog comparison of the same geometry;
- readable building/tree/avatar silhouettes at 640×360;
- rejection if the result reads as generic low-poly + pixelate filter.

### `integration-release-engineer`

Evidence required:

- `pnpm bootstrap`;
- `pnpm typecheck`;
- existing server tests;
- `pnpm build`;
- repository validators;
- Linux release candidate validation remains green;
- legacy `?hubRenderer=legacy2d` remains functional.

## Current implementation status

Implemented in the branch before independent review:

- [x] scene-specific legacy 480×270 / Hub 640×360 constants;
- [x] renderer feature flag, legacy default;
- [x] machine-readable migration Geometry Lock baseline;
- [x] orthographic logical→ground projection;
- [x] Three.js procedural vertical slice;
- [x] fixed 320×180 low-resolution canvas;
- [x] toon ramp + palette + Bayer + depth/normal edge pipeline;
- [x] one building, one tree, avatar, path, water and ground proof;
- [x] day/night, weather and season state entry points;
- [x] semantic building picking and dossier bridge;
- [x] legacy fallback retained.

Not yet accepted / intentionally blocked:

- [ ] R1-C visual acceptance;
- [ ] authoritative 640×360 Geometry Lock replacement for migration-scaled anchors;
- [ ] full campus geometry;
- [ ] production Three.js typings dependency hardening;
- [ ] shared humanoid GLB rig;
- [ ] production performance acceptance;
- [ ] default renderer switch.

## Known POC debt

- The spike uses a second low-resolution Three.js canvas underneath the transparent Phaser canvas. Shared-context integration is a later optimisation only if measurements justify it.
- `three@0.187.0` is pinned. The core package does not ship declarations; the spike has a narrow local temporary declaration surface. Production acceptance requires replacement with maintained declarations.
- Initial 640×360 semantic anchors are explicitly marked `migration-baseline`; they are scaled from the current 480×270 runtime and are not allowed to masquerade as final art-direction Geometry Lock data.

## Stop conditions

Do not mass-produce 3D buildings, props, vegetation or character cosmetics if any of these fail:

1. R1-B Geometry Lock mapping;
2. R1-C intentional pixel-style visual acceptance;
3. CI/typecheck/build;
4. basic Web Performance budget.

Failure returns the program to renderer/shader/camera correction, not to mass asset generation.
