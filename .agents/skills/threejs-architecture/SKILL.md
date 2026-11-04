---
name: threejs-architecture
description: "Use for Vanilla Three.js orthographic Hub architecture, Phaser lifecycle ownership, feature flags, fallback and resource budgets."
---

# threejs-architecture

## When to use

Use for Vanilla Three.js orthographic Hub architecture, Phaser lifecycle ownership, feature flags, fallback and resource budgets. For related but different concerns, consult the capability catalog before choosing a specialist.

## Procedure

1. Read AGENTS.md, runtime ADRs and identify actual H3D PR branch before touching renderer code.
2. Keep React as UI shell and Phaser as lifecycle/input authority; do not introduce R3F, Babylon, WebGPU or another global game loop.
3. Preserve approved 640x360 Hub Geometry Lock, 320x180 experimental render target and default legacy2d fallback.
4. Document scene graph, resize, picking, pause/resume, disposal, rollback and independent performance tests.

## Evidence and acceptance

Return branch and exact commit, changed files, verified tests, screenshots when possible, limitations, and independent review by web-performance-engineer and integration-release-engineer. Never call a static check a live client/browser smoke. Follow AGENTS.md, agents/registry.yaml and project ADRs; this original project adaptation does not authorize remote installs or independent signoff.
