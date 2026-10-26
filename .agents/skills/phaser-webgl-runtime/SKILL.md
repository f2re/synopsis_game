# Skill — Phaser/WebGL runtime

Use for `ENGINE-*`, `packages/world-engine`, Phaser scenes, WebGL rendering and React integration.

Read ADR-0004, `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`, `agents/roles/game-runtime-webgl-engineer.md`, the living-world spec and performance role card.

Procedure: preserve the React/Phaser boundary; use pinned Phaser; enforce nearest-neighbour pixel sampling; keep frame-loop state outside React; implement deterministic scene primitives; handle pause/resume/context loss; measure frame time/memory; provide reduced-motion/low-power degradation; document visible shader/filter changes.
