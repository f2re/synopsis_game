# AGENTS.md — 26063: Позывной «Синоптик» multi-agent operating contract

This repository is developed as a coordinated multi-agent project. Read this file before editing anything, then read `agents/registry.yaml` and the role card for the task you are performing.

## Product invariants

1. The game follows the Russian synoptic meteorology school and versioned method profiles. Never invent a meteorological answer from general model knowledge when a source-backed rule is required.
2. Educational truth, game balance, UI, realtime protocol and visual style are separate layers.
3. The server is authoritative for answers, match state, rating and rewards.
4. Ranked must not become pay/grind-to-win.
5. The hub is a living layered world; the active task remains visually dominant during learning.
6. Live KN-01 data are untrusted input and must pass versioned parsing, QC and snapshotting before gameplay.
7. No public self-registration. Roster and access rules follow `docs/accounts/ROSTER_LOGIN_AND_ACCESS.md`.
8. Pixel-art direction follows `docs/BRAND_AND_LORE_26063.md`, `docs/design/PIXEL_ART_STYLE_GUIDE.md` and `docs/design/LIVING_WORLD_SYSTEM.md`.
9. Phaser 4 is the accepted browser runtime for the living pixel world. React remains the application/UI shell; professional meteorological geometry stays in `apps/web/src/features/map` on SVG/Canvas.
10. Production graphics follow `docs/design/PIXEL_ASSET_PIPELINE.md`: editable source and manifests are authoritative; `assets/generated` is build output and must never be hand-edited.
11. Foundation/MVP topology is exactly `apps/web`, `apps/server` plus `packages/kn01-codec`, `packages/content-engine`, `packages/game-rules`, `packages/world-engine`, and `packages/contracts`. A new app or package boundary requires a new ADR first.
12. Arena TV is the read-only `/arena-tv` route of `apps/web`; do not recreate `apps/display` or `apps/spectator` during Foundation/MVP.
13. The canonical user-facing title is `26063: Позывной «Синоптик»`. Old display titles are forbidden by `tools/validate_brand.py`. Internal package IDs such as `synopsis_game` and `@synopsis/*` remain stable unless a dedicated architectural decision changes them.

## Mandatory source documents

- `docs/BRAND_AND_LORE_26063.md`
- `docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md`
- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`
- `docs/09_SOURCE_POLICY.md`
- `docs/architecture/README.md`
- `docs/architecture/GAME_RUNTIME_AND_ASSETS.md`
- `docs/decisions/ADR-0005-mvp-modular-monolith-boundaries.md`
- `docs/design/PIXEL_ASSET_PIPELINE.md`
- `docs/testing/QUALITY_GATES.md`
- `config/brand.yaml`
- `config/art-toolchain.yaml` for accepted runtime/art tooling
- domain-specific docs referenced by `agents/registry.yaml`

## Architecture boundary

Foundation/MVP physical topology:

```text
apps/
  web/
  server/
packages/
  kn01-codec/
  content-engine/
  game-rules/
  world-engine/
  contracts/
```

`identity`, `live-ingest`, `realtime`, `broadcast`, `replay`, and `rewards` remain internal modules of `apps/server` until an ADR demonstrates a stable reusable boundary and independent consumers. Meteorological map rendering remains an `apps/web` feature, not a separate package at this stage.

Run repository validators before handoff:

```bash
python tools/validate_repo.py
python tools/validate_architecture.py
python tools/validate_brand.py
python tools/validate_pixel_art.py
```

## Agent routing

Use `agents/registry.yaml` as the source of truth for role ownership. One task has one implementation owner and one or more independent reviewers.

No agent may self-approve a gated change. In particular:

- meteorological content requires independent methodology + verification review;
- candidate pixel art first requires independent `pixel-art-quality-reviewer` acceptance of grid, clusters, frame consistency and production fitness;
- visual concept, composition, brand and atmosphere then require Art Director review;
- Phaser/WebGL runtime changes are owned by `game-runtime-webgl-engineer` and require Web Performance review;
- source-to-runtime asset pipeline changes are owned by `pixel-asset-pipeline-engineer` and require Integration & Release review;
- animation-heavy browser changes require Web Performance review;
- auth/security changes require Security review;
- release/integration is accepted by Integration & Release, not by the feature author.

## Pixel-art and runtime ownership

- `art-director` owns palette roles, composition, scale families, scene density, brand/lore visual coherence and final visual acceptance.
- `pixel-asset-designer` owns editable production art in `assets/source`; it does not own packing/compression, renderer code or its own acceptance.
- `pixel-art-quality-reviewer` independently owns technical pixel-art acceptance: logical grid, cluster discipline, frame/pivot consistency, palette/alpha discipline and raster production fitness.
- `pixel-asset-pipeline-engineer` owns `tools/assets`, `assets/manifests`, deterministic generation, sprite-tools, AssetPack and the Tiled scene/asset-ID contract.
- `game-runtime-webgl-engineer` owns `packages/world-engine`, Phaser/WebGL configuration, React↔Phaser lifecycle, texture sampling, cameras, tweens, filters/shaders and renderer diagnostics.
- `living-world-engineer` owns world state, time/season behaviour, seeded ambient schedules and interactable state machines using runtime primitives; it does not own renderer internals.
- `web-performance-engineer` independently measures and accepts browser/GPU budgets and degradation behaviour.

World logic must use semantic asset IDs from manifests. Do not hardcode generated atlas coordinates into gameplay/world state.

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

The Art Director owns palette roles, composition hierarchy, sprite language, time-of-day tokens, scene coordinates/config and compliance with `docs/BRAND_AND_LORE_26063.md`. Professional meteorological colors are reserved and cannot be repurposed cosmetically.

Base-campus art for `26063` must read as a St Petersburg / North-West-inspired fictional scientific campus: low horizon, water, regional vegetation and layered cloudiness. Alpine scenery is not the permanent Hub background.

World time must be configurable through a `world_location` profile containing latitude, longitude and timezone. Day phase should be derived from date/time and solar state, with explicit demo overrides; never hardcode the developer's or user's physical location into assets.

Production art uses the canonical locations and formats in `assets/README.md` and `config/art-toolchain.yaml`. Concept/reference images under `design/pixel-art/` are references, not runtime source assets. Reference images carrying obsolete branding are composition-only legacy references.

## Game runtime acceptance

Phaser/WebGL changes must preserve the React/Phaser boundary, nearest-neighbour pixel sampling where applicable, deterministic scene behaviour, pause/resume/context-loss handling and reduced-motion/low-power modes. Per-frame React state updates from the game loop are forbidden.

Sprite frame cadence is independent from display cadence: movement/camera/tweens may update every rendered frame while authored pixel animation keeps intentional lower frame timing. Do not create blurred interpolated sprite frames.

## Asset pipeline acceptance

Every production asset must be reproducible from editable source + manifest + pinned toolchain. Preserve animation tags/durations, pivots, palette roles, scene/layer identity, interaction bounds and rights/provenance. Generated atlases/textures/metadata are never manually corrected after generation; fix source or pipeline and rebuild.

## Audio acceptance

Ambient audio must be procedural/authored or sourced under an explicitly compatible license. Every third-party sound requires provenance: source URL, author, license, attribution requirement, local asset path and checksum. Never download or ship an asset of unknown rights.

## Performance acceptance

Animation and visual work must define budgets for desktop, classroom/projector and mid-range mobile. Reduced-motion is mandatory. Ambient effects may degrade gracefully but educational interaction may not.

## Provider adapters

- Codex: this `AGENTS.md` is the repository-level instruction source.
- Claude Code: read `CLAUDE.md`, which points to the same role registry.
- Gemini / Antigravity: read `GEMINI.md` plus `.agents/rules/`, `.agents/workflows/` and `.agents/skills/`.

Provider choice never changes acceptance criteria.
