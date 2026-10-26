# Skill — Living World in Browser

Use for time-of-day, seasons, ambient animation, fauna, interactables and responsive/performance work.

Read:
- `docs/design/LIVING_WORLD_SYSTEM.md`
- `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`
- `agents/roles/living-world-engineer.md`
- `agents/roles/game-runtime-webgl-engineer.md`
- `agents/roles/web-performance-engineer.md`
- Art Director world-location policy

Procedure:
1. Read `world_location` data (lat/lon/timezone) and compute solar phase from configured world coordinates/date/time; do not use hidden user location.
2. Convert phase into world design tokens: sky, tint, shadows, windows, lamps, stars/fog.
3. Schedule ambient loops from seed/state; keep frame-level animation local.
4. Express world behaviour as state/schedules and consume Phaser primitives owned by `game-runtime-webgl-engineer`; do not create a parallel renderer or game loop.
5. Select density profile for Hub/Study/Battle/Projector/Reduced Motion.
6. Make interactive objects discrete state machines, not arbitrary DOM timers.
7. Use semantic asset IDs from validated manifests; never hardcode generated atlas coordinates.
8. Verify pause/throttle for hidden/offscreen content.
9. Measure runnable performance on required device profiles; ambient layers degrade before task UI.

Deliver world-state contract, animation budget, responsive rules and performance evidence.
