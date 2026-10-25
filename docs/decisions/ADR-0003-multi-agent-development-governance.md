# ADR-0003: Provider-neutral multi-agent development governance

**Status:** accepted

**Date:** 2026-10-25

## Context

The project combines domain-critical Russian synoptic meteorology, live KN-01 ingestion, realtime PvP, a persistent pixel-art living world, browser animation/performance, audio assets, closed-roster identity and autonomous public display. A single generalist agent can implement a feature but must not also be the sole authority that accepts its methodology, visual coherence, security and release readiness.

The project is expected to be worked on with Codex, Claude Code and Gemini/Antigravity. Provider-specific capabilities differ, therefore role ownership and acceptance criteria must remain independent of model vendor.

## Decision

1. `AGENTS.md` is the repository-wide operating contract.
2. `agents/registry.yaml` is the canonical role/provider/ownership/reviewer registry.
3. Codex, Claude Code and Gemini/Antigravity receive thin project entrypoints (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`).
4. Antigravity additionally uses `.agents/rules`, `.agents/workflows` and `.agents/skills` for repeatable workspace operations.
5. Every roadmap task has one implementation owner; independent review roles are attached by risk/domain.
6. Self-approval is forbidden for gated work.
7. Ranked/Exam meteorological truth requires two independent roles: Russian Synoptic Methodologist and Meteorological Verifier.
8. Art Direction, browser/performance, security/privacy and integration/release are independent blocking gates where applicable.
9. A provider can be substituted by the fallback provider without changing the role contract or acceptance standard.
10. Agent execution must leave auditable artifacts: commits, tests, handoff records, review verdicts or equivalent logs. A claimed background agent run without evidence is not considered work completed.

## Consequences

### Positive

- meteorological answers receive independent source-backed acceptance;
- art direction cannot silently drift between implementation agents;
- browser performance and accessibility can veto visually approved but unusable effects;
- audio rights/provenance become explicit;
- Codex/Claude/Gemini can work in parallel under the same task vocabulary;
- implementation ownership is traceable to roadmap task IDs.

### Costs

- more review handoffs;
- some tasks require multiple provider sessions;
- provider adapters and workflows must be maintained as tools evolve;
- blocked reviewer disagreement can delay Ranked publication.

## References

- [`../../AGENTS.md`](../../AGENTS.md)
- [`../../CLAUDE.md`](../../CLAUDE.md)
- [`../../GEMINI.md`](../../GEMINI.md)
- [`../../agents/README.md`](../../agents/README.md)
- [`../../agents/registry.yaml`](../../agents/registry.yaml)
- [`../../agents/tasks/FOUNDATION_OWNERSHIP.md`](../../agents/tasks/FOUNDATION_OWNERSHIP.md)
- [`../testing/QUALITY_GATES.md`](../testing/QUALITY_GATES.md)
