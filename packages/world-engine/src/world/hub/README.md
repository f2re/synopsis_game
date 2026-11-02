# Hub world definition

The files in this directory own renderer-independent spatial semantics for the Hub.

Rules:

- gameplay IDs are semantic strings such as `building.archive`, never Three.js UUIDs or atlas coordinates;
- logical coordinates are defined in the Hub canonical 640×360 space;
- collision/navigation/interaction truth belongs here or in adjacent renderer-independent world modules;
- render meshes may be regenerated, replaced or instanced without changing gameplay IDs;
- weather, season, time-of-day and progression states change materials/particles/visibility, not canonical geometry;
- the current `HUB_WORLD_DEFINITION_V1` is explicitly a `migration-baseline` until accepted Geometry Lock coordinates are transferred from the art-direction contract.

Renderer code consumes this definition. Renderer code must not silently become a second source of world geometry truth.
