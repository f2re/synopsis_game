# Workflow — Phaser/WebGL acceptance

1. `game-runtime-webgl-engineer` implements the scoped `ENGINE-*` task using the pinned versions in `config/art-toolchain.yaml`.
2. `art-director` checks composition, pixel language and asset use when visuals change.
3. `ux-accessibility-reviewer` checks mobile, keyboard/focus boundaries, projector readability and reduced-motion behaviour.
4. `web-performance-engineer` independently profiles frame pacing, GPU/texture memory, resize/DPR behaviour and resource disposal.
5. `integration-release-engineer` verifies build, E2E and replay integration and closes the gate.

A performance reviewer may request a change but must not silently rewrite the renderer architecture and self-approve it. Any new package or application boundary requires an ADR first.
