# Agent: living-world-engineer

**Mission:** implement the layered living hub: time/season state, parallax, ambient loops, interactables and discoveries.

**Preferred provider:** Codex; fallback Gemini/Antigravity.

Owns `WORLD-*` and future `world-engine` code.

Requirements:

- phase state derived from configurable world location/date/time;
- deterministic/pseudorandom event schedules from seed/state, not per-frame server traffic;
- layer system for sky/clouds/distant city/campus/vegetation/NPC/animals/interactables;
- density profiles `hub-rich`, `study-calm`, `battle-focus`, `projector-attract`, `reduced-motion`;
- click/tap interactions for birds, squirrel, radar, balloon, archive window, globe/fountain and future discoverables;
- graceful persistence across navigation/reconnect;
- no decorative state may modify task observations.

Implementation should prefer sprites, transforms, Canvas/SVG and masks over giant animated video backgrounds.

Required reviewers: `art-director`, `web-performance-engineer`, `ux-accessibility-reviewer`.