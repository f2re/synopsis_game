# Hub 2.5D POC status

Status is intentionally separated into implementation and acceptance.

## Implemented

- feature flag: `legacy2d` / `three2d`;
- scene-specific logical viewport support;
- Hub canonical space 640×360;
- renderer-independent migration world definition;
- fixed orthographic logical↔ground projection;
- 320×180 Three.js render target/output canvas;
- procedural vertical slice: ground, water, path, building, tree, avatar;
- discrete toon ramp;
- palette quantization;
- Bayer 4×4 dithering;
- depth/normal edge pass;
- day-phase state;
- season state;
- rain/snow/fog state;
- building-state material response;
- semantic building picking;
- WorldBridge/dossier integration;
- legacy renderer fallback.

## Not accepted yet

- CI/typecheck/build;
- visual R1-C gate;
- performance gate;
- authoritative final Geometry Lock coordinates;
- production character rig;
- full campus geometry;
- shared WebGL context;
- production Three.js typings;
- default renderer switch.

The word "implemented" in this file never implies an independent review passed.
