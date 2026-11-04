---
name: gameplay-implementation
description: "Use for implementing approved server-authoritative game rules, deterministic fixtures, replay behavior and abuse-case regression tests."
---

# gameplay-implementation

## When to use

Use for implementing approved server-authoritative game rules, deterministic fixtures, replay behavior and abuse-case regression tests. For neighboring responsibilities consult `agents/capability-catalog.json` and the source of truth for ownership.

## Procedure

1. Read agents/roles/realtime-arena-engineer.md, packages/game-rules, packages/contracts and approved balance profile.
2. Keep server authority over answers, rewards and match state, and do not expose hidden correct answers to clients.
3. Test seed stability, reconnect, duplicate or out-of-order inputs, race boundaries, timeouts and replay parity.
4. Route changes to meteorological answer truth through both independent Russian methodology reviewers.

## Evidence and acceptance

Provide target branch/SHA, changed assets or code, executed commands, relevant fixtures and test results, reviewer decisions and risks. Follow `AGENTS.md`, `agents/registry.yaml` and accepted ADRs; do not install third-party tools or claim an agent ran without a log. Independent review by gameplay-balance-designer, meteo-methodologist-ru and integration-release-engineer is required where changes touch their domain.
