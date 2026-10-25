# AGENTS.md — Synoptic Center multi-agent operating contract

This repository is developed as a coordinated multi-agent project. Read this file before editing anything, then read `agents/registry.yaml` and the role card for the task you are performing.

## Product invariants

1. The game follows the Russian synoptic meteorology school and versioned method profiles. Never invent a meteorological answer from general model knowledge when a source-backed rule is required.
2. Educational truth, game balance, UI, realtime protocol and visual style are separate layers.
3. The server is authoritative for answers, match state, rating and rewards.
4. Ranked must not become pay/grind-to-win.
5. The hub is a living layered world; the active task remains visually dominant during learning.
6. Live KN-01 data are untrusted input and must pass versioned parsing, QC and snapshotting before gameplay.
7. No public self-registration. Roster and access rules follow `docs/accounts/ROSTER_LOGIN_AND_ACCESS.md`.
8. Pixel-art direction follows `docs/design/PIXEL_ART_STYLE_GUIDE.md` and `docs/design/LIVING_WORLD_SYSTEM.md`.

## Mandatory source documents

- `docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md`
- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`
- `docs/09_SOURCE_POLICY.md`
- `docs/architecture/README.md`
- `docs/testing/QUALITY_GATES.md`
- domain-specific docs referenced by `agents/registry.yaml`

## Agent routing

Use `agents/registry.yaml` as the source of truth for role ownership. One task has one implementation owner and one or more independent reviewers.

No agent may self-approve a gated change. In particular:

- meteorological content requires independent methodology + verification review;
- visual changes require Art Director review;
- animation-heavy browser changes require Web Performance review;
- auth/security changes require Security review;
- release/integration is accepted by Integration & Release, not by the feature author.

## Branch and handoff

Recommended branch: `agent/<agent-id>/<task-id>-<slug>`.

Every non-trivial handoff must state:

- task ID and agent ID;
- files changed;
- assumptions;
- tests/evidence;
- unresolved risks;
- required reviewer(s).

Do not claim an agent, review or test ran unless there is an artifact, log, commit, PR review or explicit recorded result.

## Meteorology acceptance

For any change that alters a correct answer, terminology, sequence, symbol, KN-01 encoding/decoding, frontological rule, AT/OT interpretation or explanatory feedback:

1. `meteo-methodologist-ru` establishes the source-backed interpretation and method profile.
2. `meteo-verifier` independently reproduces/checks the result without relying on the implementer's conclusion.
3. Machine-checkable rules are encoded in tests/fixtures where possible.
4. Disagreement blocks Ranked/Exam publication and is recorded as a methodology issue or method-profile split.

## Design acceptance

The Art Director owns palette roles, composition hierarchy, sprite language, time-of-day tokens and scene coordinates/config. Professional meteorological colors are reserved and cannot be repurposed cosmetically.

World time must be configurable through a `world_location` profile containing latitude, longitude and timezone. Day phase should be derived from date/time and solar state, with explicit demo overrides; never hardcode the developer's or user's physical location into assets.

## Audio acceptance

Ambient audio must be procedural/authored or sourced under an explicitly compatible license. Every third-party sound requires provenance: source URL, author, license, attribution requirement, local asset path and checksum. Never download or ship an asset of unknown rights.

## Performance acceptance

Animation and visual work must define budgets for desktop, classroom/projector and mid-range mobile. Reduced-motion is mandatory. Ambient effects may degrade gracefully but educational interaction may not.

## Provider adapters

- Codex: this `AGENTS.md` is the repository-level instruction source.
- Claude Code: read `CLAUDE.md`, which points to the same role registry.
- Gemini / Antigravity: read `GEMINI.md` plus `.agents/rules/`, `.agents/workflows/` and `.agents/skills/`.

Provider choice never changes acceptance criteria.