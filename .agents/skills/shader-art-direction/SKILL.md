---
name: shader-art-direction
description: "Use for art direction of GLSL weather effects, water, outlines, dithering, palette transitions and reduced-motion fallback."
---

# shader-art-direction

## When to use

Use for art direction of GLSL weather effects, water, outlines, dithering, palette transitions and reduced-motion fallback. For related but different concerns, consult the capability catalog before choosing a specialist.

## Procedure

1. Read project pixel-art design and accepted Hub geometry lock before proposing shader aesthetics.
2. Keep buildings, paths, cameras and scientific observations fixed while weather/material appearance changes.
3. Prepare visual parameter table for clear, overcast, precipitation, night, reduced-motion and low-power states.
4. Request matched before/after scene captures and reject flicker, blur, noise, palette drift or excessive GPU cost.

## Evidence and acceptance

Return branch and exact commit, changed files, verified tests, screenshots when possible, limitations, and independent review by art-director plus independent game-runtime-webgl-engineer. Never call a static check a live client/browser smoke. Follow AGENTS.md, agents/registry.yaml and project ADRs; this original project adaptation does not authorize remote installs or independent signoff.
