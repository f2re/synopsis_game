---
name: glsl-webgl-shaders
description: "Use for writing WebGL2 GLSL shaders, checking uniforms, precision, alpha, texture sampling and GPU cost in Phaser or experimental Three.js."
---

# glsl-webgl-shaders

## When to use

Use for writing WebGL2 GLSL shaders, checking uniforms, precision, alpha, texture sampling and GPU cost in Phaser or experimental Three.js. For related but different concerns, consult the capability catalog before choosing a specialist.

## Procedure

1. Inspect the selected branch, Phaser 4.2.1 or H3D renderer and actual shader dialect before editing. H3D files may not exist in main.
2. Define vertex/fragment contracts, uniforms, varyings, precision, texture coordinates and controlled fallback; no per-frame React loop.
3. Check nearest-neighbour rendering, alpha edges, sRGB/linear conversion, pixel-grid alignment and context loss/resize cleanup.
4. Capture actual browser compile errors and visual output; benchmark GPU frame costs only on representative devices.

## Evidence and acceptance

Return branch and exact commit, changed files, verified tests, screenshots when possible, limitations, and independent review by web-performance-engineer plus art-director. Never call a static check a live client/browser smoke. Follow AGENTS.md, agents/registry.yaml and project ADRs; this original project adaptation does not authorize remote installs or independent signoff.
