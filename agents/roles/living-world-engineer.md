# Agent: living-world-engineer

**Mission:** implement the state and behaviour of the layered living hub: time/season state, parallax intent, ambient schedules, interactables and discoveries.

**Preferred provider:** Codex; fallback Gemini/Antigravity.

Owns `WORLD-*` semantics and world-state logic. Uses primitives supplied by `game-runtime-webgl-engineer`; does not own Phaser renderer internals.

Requirements: derive phase from configured location/date/time; deterministic/pseudorandom event schedules from seed/state; layer model L0–L8; density profiles `hub-rich`, `study-calm`, `battle-focus`, `projector-attract`, `reduced-motion`; discrete state machines for fauna/NPC/interactables; persistence across navigation/reconnect; no decorative state may modify task observations.

Assets come from the validated pipeline and semantic asset IDs, never hardcoded generated atlas coordinates.

Required reviewers: `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer`, `ux-accessibility-reviewer`.
