# ADR-0002: Autonomous living runtime as a product foundation

**Status:** accepted

## Context

The project originally described a classroom-first game where an instructor could create rooms, launch tournaments and operate projector mode. The updated product direction requires the system to be interesting and functional without continuous instructor operation and to behave like a living game world rather than a static learning dashboard.

## Decision

We adopt the following as product-level architectural constraints:

1. The hub is a layered living world with time-of-day, seasons, ambient animation, interactive animals/objects and discoveries.
2. КН-01 supports a live-data pipeline from real station telegram feeds through versioned parser/encoder rulesets and validated snapshot packs.
3. Match validation, ranking, tournament progression and result calculation are autonomous.
4. Arena TV/projector mode automatically selects and switches live matches, highlights, leaderboards and attract-mode scenes.
5. Public self-registration is disabled; users are provisioned by an administrator/roster import.
6. Classroom login is intentionally simple, with security profiles separating trusted local deployments from public Internet deployments.
7. Avatar customization and earned cosmetics are a permanent identity layer, but cannot change Ranked power.
8. Instructor tools remain available for configuration, review and override, but are not required for ordinary runtime operation.

## Consequences

### Positive

- the game can run in a classroom, hallway display or event unattended;
- current real data can continuously create fresh training material;
- school visitors can understand and watch the game without an instructor explanation;
- the hub becomes a return-to-game space rather than menu chrome;
- user identity is simple for controlled educational deployments;
- cosmetics give long-term progression without pay-to-win.

### Costs

- additional `world-engine`, `live-ingest`, `broadcast-selector`, `identity` and `rewards` domains;
- stronger automated validation is mandatory;
- kiosk/display reliability becomes a production requirement;
- very short classroom PINs require deployment-specific controls and cannot be treated as secure Internet passwords.

## References

- [`../00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md`](../00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md)
- [`../design/LIVING_WORLD_SYSTEM.md`](../design/LIVING_WORLD_SYSTEM.md)
- [`../content/LIVE_KN01_PIPELINE.md`](../content/LIVE_KN01_PIPELINE.md)
- [`../realtime/AUTONOMOUS_ARENA_DISPLAY.md`](../realtime/AUTONOMOUS_ARENA_DISPLAY.md)
- [`../accounts/ROSTER_LOGIN_AND_ACCESS.md`](../accounts/ROSTER_LOGIN_AND_ACCESS.md)
- [`../game-design/AVATAR_AND_COSMETIC_PROGRESSION.md`](../game-design/AVATAR_AND_COSMETIC_PROGRESSION.md)
