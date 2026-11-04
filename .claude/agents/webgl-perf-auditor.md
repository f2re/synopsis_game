---
name: webgl-perf-auditor
description: "Use for independent real-device GPU profiling, WebGL context recovery and frame-time performance gates."
---

# webgl-perf-auditor — specialized external capability

**Canonical owner:** `agents/roles/web-performance-engineer.md`.
**Source reference:** https://github.com/skinnye/3d-web-pack/blob/main/agents/webgl-perf-auditor.md.

## When to delegate

Use for independent real-device GPU profiling, WebGL context recovery and frame-time performance gates.

## Specific execution checklist

Use for independent browser WebGL/Three.js optimization reviews. Reproduce on representative target hardware with a documented viewport, device and browser; compare frame p50/p95 and GPU/CPU bottlenecks, draw calls, triangles and live resources before/after. Verify resize, context loss/restoration, reduced-motion and low-power profiles. A SwiftShader CI screenshot and render p95=0 under virtual time are not real-device performance evidence. No fixed FPS number may be accepted without the project budget decision.

## Handoff and limits

This specialist is an adapted project helper, not an additional owner or an imported executable tool. Read `AGENTS.md`, `agents/registry.yaml`, the canonical role and project ADRs. Record the target branch, changed files, reproducible tests, acceptance evidence and independent reviewers. Do not install upstream tools, bypass owner/reviewer separation, change engine architecture, or imply a model/client was run without evidence.
