---
name: hub-nav-geometry
description: "Hub 640x360 Ground footprint, route topology, entrances and obstacle checks"
---

# hub-nav-geometry

Read ADR-0007, `HubWorldDefinition.ts`, `HubNavigation.ts`, `HubCollision.ts`, H3D-035/036/037, and Geometry Lock v1. Use renderer-independent semantic coordinates. Screen bounds and facade silhouettes are never ground collision footprints. Overlay the actual 3D ground polygons, water band, path polylines and door anchors before route edits. Validate every building entrance and connected walkway; check avatar clearance, blocked paths, dynamic obstacles, disconnected graph and retargeting. Do not solve polygon overlap by silently moving locked architecture or enabling impassable collision geometry.

Upstream research reference (not a runtime dependency): https://github.com/bullish0x/GameStudio/blob/HEAD/.agents/agents/level-designer.md

Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
