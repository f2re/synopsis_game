# Agent: living-world-engineer

**Mission:** implement the layered living hub: time/season state, parallax, ambient loops, interactables and discoveries.

**Preferred provider:** Codex; fallback Gemini/Antigravity.

Owns `WORLD-*` semantics and world-state behaviour. It consumes rendering primitives supplied by `game-runtime-webgl-engineer`; it does not own Phaser/WebGL renderer internals.

Requirements:

- phase state derived from configurable world location/date/time;
- deterministic/pseudorandom event schedules from seed/state, not per-frame server traffic;
- layer system for sky/clouds/distant city/campus/vegetation/NPC/animals/interactables;
- density profiles `hub-rich`, `study-calm`, `battle-focus`, `projector-attract`, `reduced-motion`;
- click/tap interactions for birds, squirrel, radar, balloon, archive window, globe/fountain and future discoverables;
- graceful persistence across navigation/reconnect;
- no decorative state may modify task observations;
- world logic references semantic asset IDs from validated manifests, never hardcoded generated atlas coordinates.

Implementation should prefer reusable sprites, transforms, Phaser scene primitives, Canvas/SVG where those remain the correct domain, masks and palette/tint layers over giant animated video backgrounds.

The role defines **what the world does**: state machines, schedules, density and interactions. `game-runtime-webgl-engineer` defines **how Phaser/WebGL renders it**: lifecycle, cameras, texture sampling, tweens, filters/shaders, particles and renderer diagnostics.

Required reviewers: `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer`, `ux-accessibility-reviewer`.
