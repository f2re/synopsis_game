# Foundation task ownership

Canonical foundation task definitions live in `docs/roadmap/FOUNDATION_EPICS.md`. Phaser/WebGL and asset-pipeline definitions live in `docs/roadmap/PIXEL_RUNTIME_EPICS.md`. Sprite-production definitions live in `docs/roadmap/SPRITE_PRODUCTION_EPICS.md`. This file assigns implementation ownership and independent acceptance.

## ENGINE — Phaser/WebGL runtime

| Task | Owner | Required review |
|---|---|---|
| ENGINE-001 Phaser package/runtime scaffold | `game-runtime-webgl-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ENGINE-002 React↔Phaser mount/lifecycle bridge | `game-runtime-webgl-engineer` | `web-performance-engineer`, `ux-accessibility-reviewer` |
| ENGINE-003 Pixel sampling/scaling/camera | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |
| ENGINE-004 Scene/layer/tween/animation primitives | `game-runtime-webgl-engineer` | `living-world-engineer`, `web-performance-engineer` |
| ENGINE-005 Filters/shaders/particles | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |

## ASSET — pixel-art production pipeline

| Task | Owner | Required review |
|---|---|---|
| ASSET-001 Source tree/naming/manifest contract | `pixel-asset-pipeline-engineer` | `pixel-asset-designer`, `art-director` |
| ASSET-002 sprite-tools validation/metadata | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-003 AssetPack atlas/optimisation | `pixel-asset-pipeline-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ASSET-004 Tiled scene contract | `pixel-asset-pipeline-engineer` | `game-runtime-webgl-engineer`, `living-world-engineer`, `art-director` |
| ASSET-005 Provenance/reproducibility | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-006 Visual/runtime regression fixtures | `integration-release-engineer` | `art-director`, `web-performance-engineer` |

## SPRITE — production art families

Canonical scope, animation counts and sequencing are defined in `docs/design/sprites/` and `docs/roadmap/SPRITE_PRODUCTION_EPICS.md`.

| Tasks | Owner | Required review |
|---|---|---|
| SPRITE-001 | `pixel-asset-designer` | `art-director`, `pixel-asset-pipeline-engineer` |
| SPRITE-002…004 | `pixel-asset-designer` | `art-director`, `pixel-asset-pipeline-engineer`; add `identity-avatar-engineer`, `game-runtime-webgl-engineer` or `web-performance-engineer` as specified by the task |
| SPRITE-005…010 | `pixel-asset-designer` | `art-director`, `living-world-engineer`; add pipeline/runtime/performance review as specified |
| SPRITE-011 | `pixel-asset-designer` | `art-director`, `ux-accessibility-reviewer`, `meteo-methodologist-ru` for the boundary with professional meteorological graphics |
| SPRITE-012…016 | `pixel-asset-designer` | task-specific reviewers from the sprite roadmap |
| SPRITE-017 | `integration-release-engineer` | `pixel-asset-pipeline-engineer`, `art-director`, `web-performance-engineer` |

A `SPRITE-*` task is incomplete until the whole required family exists: variants, directions, states, transitions, reduced-motion fallback, manifest data and reproducible generated output. A single showcase frame cannot close a sprite task.

## WORLD — Living World

| Task | Owner | Required review |
|---|---|---|
| WORLD-001 Time-of-day | `living-world-engineer` | `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer` |
| WORLD-002 Ambient layers | `living-world-engineer` | `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer`, `ux-accessibility-reviewer` |
| WORLD-003 Interactables | `living-world-engineer` | `art-director`, `game-runtime-webgl-engineer`, `web-performance-engineer`, `ux-accessibility-reviewer` |
| WORLD-004 Discoveries | `living-world-engineer` | `gameplay-balance-designer`, `art-director` |
| WORLD-005 Reduced motion | `web-performance-engineer` | `ux-accessibility-reviewer`, `living-world-engineer`, `game-runtime-webgl-engineer` |

Asset sub-tasks for WORLD are authored by `pixel-asset-designer` and packaged by `pixel-asset-pipeline-engineer`; sound sub-tasks by `audio-ambient-designer`.

## KN01-LIVE — Real observation pipeline

All `KN01-LIVE-001…007` are implemented by `live-kn01-engineer`.

Required gates:
- `meteo-methodologist-ru` — ruleset/methodology acceptance;
- `meteo-verifier` — independent expected-result verification;
- `security-privacy-reviewer` — untrusted ingress/feed boundaries;
- `integration-release-engineer` — deterministic snapshot/replay/integration.

## AUTO-ARENA

| Task | Owner | Required review |
|---|---|---|
| ARENA-001 Matchmaking | `realtime-arena-engineer` | `gameplay-balance-designer`, `security-privacy-reviewer` |
| ARENA-002 Tournament progression | `realtime-arena-engineer` | `gameplay-balance-designer`, `integration-release-engineer` |
| ARENA-003 Broadcast selector | `realtime-arena-engineer` | `integration-release-engineer`, `ux-accessibility-reviewer` |
| ARENA-004 Arena TV | `realtime-arena-engineer` | `art-director`, `web-performance-engineer`, `security-privacy-reviewer` |
| ARENA-005 Attract mode | `living-world-engineer` | `art-director`, `realtime-arena-engineer`, `game-runtime-webgl-engineer`, `web-performance-engineer` |
| ARENA-006 Highlight engine | `realtime-arena-engineer` | `gameplay-balance-designer`, `art-director` |
| ARENA-007 Watchdog/fallback | `integration-release-engineer` | `realtime-arena-engineer`, `web-performance-engineer` |

## IDENTITY

| Task | Owner | Required review |
|---|---|---|
| ID-001 Admin roster CRUD | `identity-avatar-engineer` | `security-privacy-reviewer` |
| ID-002 Roster import | `identity-avatar-engineer` | `security-privacy-reviewer`, `integration-release-engineer` |
| ID-003 Classroom login | `identity-avatar-engineer` | `security-privacy-reviewer`, `ux-accessibility-reviewer` |
| ID-004 Security profiles | `security-privacy-reviewer` | `identity-avatar-engineer`, `integration-release-engineer` |
| ID-005 Display role | `identity-avatar-engineer` | `security-privacy-reviewer`, `realtime-arena-engineer` |
| ID-006 Temporary guest roster | `identity-avatar-engineer` | `security-privacy-reviewer` |

## AVATAR / COSMETICS

| Task | Owner | Asset contributor | Required review |
|---|---|---|---|
| AVATAR-001 Avatar schema | `identity-avatar-engineer` | `pixel-asset-designer` | `art-director`, `ux-accessibility-reviewer` |
| AVATAR-002 First-login creator | `identity-avatar-engineer` | `pixel-asset-designer` | `art-director`, `ux-accessibility-reviewer` |
| AVATAR-003 Starter styles | `pixel-asset-designer` | `pixel-asset-pipeline-engineer` | `art-director`, `identity-avatar-engineer` |
| AVATAR-004 Cosmetic inventory | `identity-avatar-engineer` | `pixel-asset-designer` | `art-director`, `gameplay-balance-designer` |
| AVATAR-005 Pencil collection | `pixel-asset-designer` | `pixel-asset-pipeline-engineer` | `art-director`, `meteo-methodologist-ru` for terminology only |
| AVATAR-006 Companions | `pixel-asset-designer` | `living-world-engineer` | `art-director`, `pixel-asset-pipeline-engineer`, `web-performance-engineer` |
| AVATAR-007 Reward hooks | `gameplay-balance-designer` | `identity-avatar-engineer` | `integration-release-engineer` |

## Existing MVP epics

| Prefix | Default owner | Key reviewers |
|---|---|---|
| METH-* | `meteo-methodologist-ru` | `meteo-verifier` |
| ENG-* | `orchestrator` | `integration-release-engineer` |
| CONTENT-* | `meteo-methodologist-ru` | `meteo-verifier`, implementation owner for generator/schema |
| TASK-* | `web-performance-engineer` | `ux-accessibility-reviewer`, `art-director`; meteorology gate when answer semantics change |
| SOLO-* | `gameplay-balance-designer` | `integration-release-engineer`, `ux-accessibility-reviewer` |
| GAME-* | `gameplay-balance-designer` | `meteo-methodologist-ru`, `integration-release-engineer` |
| NET-* | `realtime-arena-engineer` | `security-privacy-reviewer`, `integration-release-engineer` |
| MODE-* | `realtime-arena-engineer` | `gameplay-balance-designer`, `integration-release-engineer` |
| CLASS-* | `realtime-arena-engineer` | `ux-accessibility-reviewer`, `security-privacy-reviewer` |
| MAP-* | `web-performance-engineer` | `meteo-methodologist-ru`, `meteo-verifier`, `art-director` |
| UX-* | `ux-accessibility-reviewer` | `art-director`, `web-performance-engineer` |

## Audio work packets

Audio is intentionally task-scoped rather than one monolithic epic. Each WORLD/Arena/interaction feature that needs sound creates an `AUDIO-*` sub-task owned by `audio-ambient-designer`, with an asset-rights manifest and Art Director review.

## Final acceptance

No row above becomes `Done` until `integration-release-engineer` can reproduce its acceptance criteria and every listed blocking gate is resolved.
