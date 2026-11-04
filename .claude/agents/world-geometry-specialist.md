---
name: world-geometry-specialist
description: "Use for Hub navigation, semantic ground footprints, collision polygons, entrances and walkability."
---

# world-geometry-specialist — specialized external capability

**Canonical owner:** `agents/roles/living-world-engineer.md`.
**Source reference:** https://github.com/bullish0x/GameStudio/blob/HEAD/.agents/agents/level-designer.md.

## When to delegate

Use for Hub navigation, semantic ground footprints, collision polygons, entrances and walkability.

## Specific execution checklist

Use for approved Hub 2.5D walking paths, real ground footprints, entrances and collision polygons. Identify the relevant H3D PR branch before reading files that do not exist on main. Compare semantic HubWorldDefinition against actual procedural meshes, never infer a collision footprint from screen-space facade bounds. Produce overlay evidence for roads, water, doors and occupied ground; reject disconnected entry routes, unsafe connectors and avatar-clearance errors. Do not alter locked geometry without art/ADR approval.

## Handoff and limits

This specialist is an adapted project helper, not an additional owner or an imported executable tool. Read `AGENTS.md`, `agents/registry.yaml`, the canonical role and project ADRs. Record the target branch, changed files, reproducible tests, acceptance evidence and independent reviewers. Do not install upstream tools, bypass owner/reviewer separation, change engine architecture, or imply a model/client was run without evidence.
