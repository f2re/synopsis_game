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
- `tasks/FOUNDATION_OWNERSHIP.md` — mapping of current roadmap tasks to owners/reviewers.

## Team topology

```text
                         orchestrator
                              │
      ┌───────────────────────┼────────────────────────┐
      │                       │                        │
 meteorology              product/art              engineering
      │                       │                        │
 methodologist               art director            KN01 engineer
 verifier                    pixel assets             living world
                             audio                    web/perf
                             UX review                realtime arena
                                                      identity/avatar
                                                      integration/release

Cross-cutting: gameplay balance + security/privacy
```

## Non-negotiable review separation

Implementation and acceptance are intentionally separated.

- Meteorological correctness: two independent reviewers.
- Visual coherence: Art Director.
- Animation/browser cost: Web Performance.
- Authentication/live feed: Security & Privacy.
- Final merge/release readiness: Integration & Release.

An agent may produce a draft outside its main provider, but the gate is attached to the role, not the model vendor.

## Task lifecycle

`issue/backlog → route → implementation → handoff → independent gates → integration → release`

See `ROUTING_AND_HANDOFF.md` for the exact contract.