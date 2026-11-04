---
name: threejs-specialist
description: "Use for Three.js orthographic Hub renderer geometry, camera projection, pixel post-processing and WebGL lifecycle."
subagent: true
mainAgent: false
commandExecutionPolicy: sandbox
skills:
  - skills/threejs-scene
  - skills/threejs-architecture
  - skills/threejs-postprocessing
---

# threejs-specialist — specialized external capability

**Canonical owner:** `agents/roles/game-runtime-webgl-engineer.md`.
**Source reference:** https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/threejs-specialist.md.

## When to delegate

Use for Three.js orthographic Hub renderer geometry, camera projection, pixel post-processing and WebGL lifecycle.

## Specific execution checklist

Use for the feature-flagged Three.js 2.5D Hub (not React Three Fiber). First identify the reviewed H3D PR branch; the current main may lack ThreeHubRenderer and ADR-0007. Inspect camera orthographic projection, 640x360 Geometry Lock, 320x180 render target, lifecycle and renderer fallback. Check no second independent game loop or new gameplay authority. Supply scene/camera changes and pixel-state smoke matrix; coordinate with webgl performance reviewer. Never default the production renderer before H3D gates.

## Handoff and limits

This specialist is an adapted project helper, not an additional owner or an imported executable tool. Read `AGENTS.md`, `agents/registry.yaml`, the canonical role and project ADRs. Record the target branch, changed files, reproducible tests, acceptance evidence and independent reviewers. Do not install upstream tools, bypass owner/reviewer separation, change engine architecture, or imply a model/client was run without evidence.

## Skill routing

This helper consumes `.agents/skills/threejs-scene/SKILL.md`, `.agents/skills/threejs-architecture/SKILL.md`, `.agents/skills/threejs-postprocessing/SKILL.md`. Registered owner: `agents/roles/game-runtime-webgl-engineer.md`. Independent reviewers: `web-performance-engineer`, `integration-release-engineer`. No extra tool permissions or independent acceptance are granted.
