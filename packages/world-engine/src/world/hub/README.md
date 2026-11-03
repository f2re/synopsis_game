# Hub world definition

The files in this directory own renderer-independent spatial semantics for the Hub.

Rules:

- gameplay IDs are semantic strings such as `building.archive`, never Three.js UUIDs or atlas coordinates;
- logical coordinates are defined in the Hub canonical 640×360 space;
- collision/navigation/interaction truth belongs here or in adjacent renderer-independent world modules;
- render meshes may be regenerated, replaced or instanced without changing gameplay IDs;
- weather, season, time-of-day and progression states change materials/particles/visibility, not canonical geometry;
- `HUB_WORLD_DEFINITION_V1` uses accepted `hub.geometry.lock_v1` (640×360) in the Three.js POC branch; its `bounds` are screen-space silhouettes, not approved ground footprints;
- `HubNavigation.ts` plans routes through intersections of canonical path polylines, with bounded first/last connectors. It never interprets screen-space building bounds as collision obstacles;
- `HubCollision.ts` validates explicit **ground-space** obstacle polygons and avatar clearance; the accepted Hub water band is enforced as a blocked polygon at runtime, while unapproved building facades are **not** treated as ground footprints;
- the route planner deletes path edges or door connectors intersecting accepted blockers and refuses a destination inside one;
- route-finding and obstacle tests are run with `pnpm world:test`; gameplay remains renderer-independent even though only the Three.js avatar currently consumes the routes;
- **not yet accepted**: pedestrian collision/occupancy polygons, building footprint approval, path width clearance for avatars, dynamic obstacles, and movement completion gating for facility interactions.

The next implementation owner (`living-world-engineer`) must add validated pedestrian footprints and entrance connectors before reporting collision-safe navigation. `game-runtime-webgl-engineer` adapts the renderer, while `web-performance-engineer` and `integration-release-engineer` independently review acceptance.

Renderer code consumes this definition. Renderer code must not silently become a second source of world geometry truth.
