# Multi-agent development team

This directory defines the executable team structure for «Синоптический центр».

## Entry points

- `../AGENTS.md` — repository-wide contract, used directly by Codex.
- `../CLAUDE.md` — Claude Code adapter.
- `../GEMINI.md` — Gemini/Antigravity adapter.
- `registry.yaml` — canonical role/ownership/reviewer matrix.
- `ROUTING_AND_HANDOFF.md` — task routing, branches and handoffs.
- `QUALITY_GATES.md` — agent-specific acceptance requirements.
- `roles/` — one role card per specialized agent.
- `tasks/FOUNDATION_OWNERSHIP.md` — foundation ownership matrix.
- `../docs/roadmap/PIXEL_RUNTIME_EPICS.md` — Phaser/WebGL and asset-pipeline implementation packets.

## Team topology

```text
                         orchestrator
                              │
      ┌───────────────────────┼───────────────────────────────┐
      │                       │                               │
 meteorology              product/art                    engineering
      │                       │                               │
 methodologist               art director                   KN01 engineer
 verifier                    pixel asset designer           pixel asset pipeline
                             audio                          Phaser/WebGL runtime
                             UX review                      living world
                                                            web/perf reviewer
                                                            realtime arena
                                                            identity/avatar
                                                            integration/release

Cross-cutting: gameplay balance + security/privacy
```

## Pixel-world separation

Art direction, editable asset creation, asset generation, runtime rendering, world behaviour and performance acceptance are deliberately separate roles:

`art-director → pixel-asset-designer → pixel-asset-pipeline-engineer → game-runtime-webgl-engineer`, while `living-world-engineer` consumes the runtime primitives and `web-performance-engineer` independently accepts browser/GPU cost.

This prevents a generated atlas, renderer implementation or optimisation shortcut from silently becoming the visual source of truth.

## Non-negotiable review separation

Implementation and acceptance are intentionally separated.

- Meteorological correctness: two independent reviewers.
- Visual coherence: Art Director.
- Phaser/WebGL implementation: Runtime owner + independent Web Performance review.
- Asset build reproducibility: Asset Pipeline owner + Integration & Release review.
- Animation/browser cost: Web Performance.
- Authentication/live feed: Security & Privacy.
- Final merge/release readiness: Integration & Release.

An agent may produce a draft outside its main provider, but the gate is attached to the role, not the model vendor.

## Task lifecycle

`issue/backlog → route → implementation → handoff → independent gates → integration → release`

See `ROUTING_AND_HANDOFF.md` for the exact contract.
