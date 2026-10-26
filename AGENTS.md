# AGENTS.md — Synoptic Center multi-agent operating contract

Read this file, `agents/registry.yaml`, the role card and task-specific docs before editing.

## Product invariants
1. Russian synoptic meteorology and versioned source-backed method profiles define educational truth.
2. Educational truth, game balance, UI, realtime protocol and visual style are separate layers.
3. Server is authoritative for answers, match state, rating and rewards.
4. The hub is a layered living world; the active task remains visually dominant.
5. Pixel-art direction follows `docs/design/PIXEL_ART_STYLE_GUIDE.md`; production assets follow `docs/design/PIXEL_ASSET_PIPELINE.md`.
6. Phaser 4 is the accepted browser game runtime for the living world; React remains the application/UI shell and `map-engine` remains a separate professional SVG/Canvas subsystem.
7. Generated assets are build products and must never be hand-edited.
8. No public self-registration; live KN-01 input is untrusted and versioned/QC-gated.

## Mandatory sources
- `docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md`
- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`
- `docs/09_SOURCE_POLICY.md`
- `docs/architecture/README.md`
- `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/testing/QUALITY_GATES.md`
- `config/art-toolchain.yaml` for visual/runtime tooling

## Routing and review
`agents/registry.yaml` is the role source of truth. One task has one implementation owner; self-approval is forbidden. Meteorology requires methodologist + verifier. Visual changes require Art Director. Phaser/WebGL changes are owned by `game-runtime-webgl-engineer` and independently reviewed by Web Performance. Asset-build changes are owned by `pixel-asset-pipeline-engineer`. Release acceptance belongs to Integration & Release.

## Pixel/runtime ownership
- `pixel-asset-designer`: editable art only.
- `pixel-asset-pipeline-engineer`: source→validated metadata→atlas/optimisation pipeline.
- `game-runtime-webgl-engineer`: Phaser/WebGL runtime and React lifecycle boundary.
- `living-world-engineer`: world behaviour/state atop runtime primitives.
- `web-performance-engineer`: independent budgets/profiling/degradation review.
- `art-director`: visual language and final visual acceptance.

Do not bypass semantic asset IDs by hardcoding generated atlas coordinates into world logic.

## Handoff
Recommended branch: `agent/<agent-id>/<task-id>-<slug>`. Every non-trivial handoff records task/agent, files, assumptions, tests/evidence, risks and required reviewers. Do not claim a review/test ran without evidence.

## Provider adapters
Codex uses this file; Claude Code uses `CLAUDE.md`; Gemini/Antigravity uses `GEMINI.md` plus `.agents/`. Provider choice never changes acceptance criteria.
