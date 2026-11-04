---
name: phaser-specialist
description: "Use for Phaser 4.2.1 scene, input, render loop, React bridge and legacy2d fallback."
subagent: true
mainAgent: false
commandExecutionPolicy: sandbox
skills:
  - skills/phaser4-scenes
  - skills/phaser4-webgl
  - skills/phaser-webgl-runtime
---

# phaser-specialist — specialized external capability

**Canonical owner:** `agents/roles/game-runtime-webgl-engineer.md`.
**Source reference:** https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/phaser-specialist.md.

## When to delegate

Use for Phaser 4.2.1 scene, input, render loop, React bridge and legacy2d fallback.

## Specific execution checklist

Use for Phaser 4.2.1 integration and React↔Phaser scene lifecycle. Inspect packages/world-engine/src/scenes and src/runtime/createWorldGame.ts and the installed APIs. Preserve the event bridge, scene pause/resume, teardown, input/picking, nearest-neighbour scaling and legacy2d fallback. Check Phaser v4 RenderNodes vs removed Phaser v3 APIs. Deliver focused tests of repeated mount/unmount and context restoration.

## Handoff and limits

This specialist is an adapted project helper, not an additional owner or an imported executable tool. Read `AGENTS.md`, `agents/registry.yaml`, the canonical role and project ADRs. Record the target branch, changed files, reproducible tests, acceptance evidence and independent reviewers. Do not install upstream tools, bypass owner/reviewer separation, change engine architecture, or imply a model/client was run without evidence.

## Skill routing

This helper consumes `.agents/skills/phaser4-scenes/SKILL.md`, `.agents/skills/phaser4-webgl/SKILL.md`, `.agents/skills/phaser-webgl-runtime/SKILL.md`. Registered owner: `agents/roles/game-runtime-webgl-engineer.md`. Independent reviewers: `web-performance-engineer`, `integration-release-engineer`. No extra tool permissions or independent acceptance are granted.
