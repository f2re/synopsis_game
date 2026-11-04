# External game/graphics agent routing — synopsis_game

**Canonical machine registry:** `agents/capability-catalog.json`. This table is a human-readable view of that catalog, not an additional source of truth. Updated 2026-11-04.

## Scope

- **19 internal owners/reviewers**, retained in `agents/registry.yaml`.
- **18 project-scoped external advisory helpers**: 5 prior + 13 newly adapted from MIT-licensed upstream role references.
- **35 canonical skills**: 23 prior + 12 newly authored project-specific procedures.
- **37 profiles per provider**: Claude Code `.claude/agents`, Antigravity `.agents/agents`, Codex `.codex/agents`.
- **35 skills per skill-discovery namespace**: project canonical `.agents/skills` for Codex/Antigravity and `.claude/skills` for Claude.

External profiles do **not** become additional implementation owners. A task must use one internal owner, one or more project skills and separate independent reviewers as defined in `agents/QUALITY_GATES.md`. Agent profiles are *instructions*, not bundled binaries, network installers, subscriptions or executed model sessions.

## All external profiles: who may use which skills

| External specialist | Project owner | Assigned skills | Independent reviewers | Provenance |
| --- | --- | --- | --- | --- |
| `threejs-specialist` | `game-runtime-webgl-engineer` | `threejs-scene`, `threejs-architecture`, `threejs-postprocessing` | `web-performance-engineer`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/threejs-specialist.md), SHA `52cd3e4b2f` |
| `phaser-specialist` | `game-runtime-webgl-engineer` | `phaser4-scenes`, `phaser4-webgl`, `phaser-webgl-runtime` | `web-performance-engineer`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/phaser-specialist.md), SHA `a35ac61543` |
| `world-geometry-specialist` | `living-world-engineer` | `hub-nav-geometry`, `threejs-geometry`, `level-layout-design` | `game-runtime-webgl-engineer`, `art-director` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/level-designer.md), SHA `e5f3460ea9` |
| `technical-artist` | `pixel-asset-pipeline-engineer` | `pixel-asset-pipeline`, `gltf-3d-pipeline`, `asset-provenance-review` | `pixel-art-quality-reviewer`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/technical-artist.md), SHA `fb2b2c97fb` |
| `webgl-perf-auditor` | `web-performance-engineer` | `threejs-performance`, `glsl-webgl-shaders`, `release-evidence` | `integration-release-engineer` | [skinnye/3d-web-pack](https://github.com/skinnye/3d-web-pack/blob/main/agents/webgl-perf-auditor.md), SHA `f0dc97a1b8` |
| `webgl-shader-specialist` | `game-runtime-webgl-engineer` | `glsl-webgl-shaders`, `threejs-postprocessing`, `phaser4-webgl` | `web-performance-engineer`, `art-director` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/webgl-shader-specialist.md), SHA `2b0af283fd` |
| `shader-artist` | `art-director` | `shader-art-direction`, `glsl-webgl-shaders`, `threejs-postprocessing` | `game-runtime-webgl-engineer`, `web-performance-engineer` | [skinnye/3d-web-pack](https://github.com/skinnye/3d-web-pack/blob/main/agents/shader-artist.md), SHA `184803df77` |
| `threejs-architect` | `game-runtime-webgl-engineer` | `threejs-architecture`, `threejs-scene`, `threejs-performance` | `web-performance-engineer`, `integration-release-engineer` | [skinnye/3d-web-pack](https://github.com/skinnye/3d-web-pack/blob/main/agents/threejs-architect.md), SHA `4affe3864c` |
| `web3d-asset-pipeline` | `pixel-asset-pipeline-engineer` | `gltf-3d-pipeline`, `threejs-assets`, `threejs-performance` | `web-performance-engineer`, `art-director` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/web3d-asset-pipeline.md), SHA `a11b2384ff` |
| `asset-pipeline-engineer` | `pixel-asset-pipeline-engineer` | `gltf-3d-pipeline`, `asset-provenance-review`, `threejs-assets` | `integration-release-engineer`, `security-privacy-reviewer` | [skinnye/3d-web-pack](https://github.com/skinnye/3d-web-pack/blob/main/agents/asset-pipeline-engineer.md), SHA `387c540375` |
| `motion-choreographer` | `living-world-engineer` | `motion-choreography`, `threejs-animation`, `living-world-browser` | `art-director`, `web-performance-engineer`, `ux-accessibility-reviewer` | [skinnye/3d-web-pack](https://github.com/skinnye/3d-web-pack/blob/main/agents/motion-choreographer.md), SHA `0852a23419` |
| `web2d-asset-pipeline` | `pixel-asset-pipeline-engineer` | `pixel-atlas-production`, `pixel-asset-pipeline`, `pixel-art-qa` | `pixel-art-quality-reviewer`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/web2d-asset-pipeline.md), SHA `b03ef28c94` |
| `level-designer` | `living-world-engineer` | `level-layout-design`, `hub-nav-geometry`, `living-world-browser` | `art-director`, `ux-accessibility-reviewer`, `game-runtime-webgl-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/level-designer.md), SHA `e5f3460ea9` |
| `gameplay-programmer` | `realtime-arena-engineer` | `gameplay-implementation`, `gameplay-determinism`, `realtime-server-authority` | `gameplay-balance-designer`, `meteo-methodologist-ru`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/gameplay-programmer.md), SHA `ca46193658` |
| `ui-programmer` | `ui-pixel-designer` | `ui-runtime-components`, `ui-accessibility`, `pixel-art-direction` | `ux-accessibility-reviewer`, `integration-release-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/ui-programmer.md), SHA `d3f240a73a` |
| `qa-lead` | `integration-release-engineer` | `game-qa-automation`, `release-evidence`, `agent-handoff-gate` | `ux-accessibility-reviewer`, `security-privacy-reviewer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/qa-lead.md), SHA `65c7a5ad2f` |
| `qa-tester` | `integration-release-engineer` | `game-qa-automation`, `ui-accessibility`, `release-evidence` | `ux-accessibility-reviewer`, `web-performance-engineer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/qa-tester.md), SHA `0a6fba50c8` |
| `audio-director` | `audio-ambient-designer` | `audio-direction-qa`, `ambient-audio`, `asset-provenance-review` | `art-director`, `ux-accessibility-reviewer` | [bullish0x/GameStudio](https://github.com/bullish0x/GameStudio/blob/main/.agents/agents/audio-director.md), SHA `7738969e3c` |

## Newly added skills: internal users and advisory specialists

| New skill | Registered internal users (roles) | External helpers that consume it |
| --- | --- | --- |
| `glsl-webgl-shaders` | `game-runtime-webgl-engineer`, `web-performance-engineer` | `webgl-perf-auditor`, `webgl-shader-specialist`, `shader-artist` |
| `shader-art-direction` | `art-director`, `web-performance-engineer`, `ui-pixel-designer` | `shader-artist` |
| `threejs-architecture` | `game-runtime-webgl-engineer` | `threejs-specialist`, `threejs-architect` |
| `gltf-3d-pipeline` | `pixel-asset-designer`, `pixel-asset-pipeline-engineer`, `web-performance-engineer` | `technical-artist`, `web3d-asset-pipeline`, `asset-pipeline-engineer` |
| `asset-provenance-review` | `pixel-asset-pipeline-engineer`, `audio-ambient-designer`, `security-privacy-reviewer`, `integration-release-engineer` | `technical-artist`, `asset-pipeline-engineer`, `audio-director` |
| `motion-choreography` | `living-world-engineer`, `identity-avatar-engineer`, `ux-accessibility-reviewer` | `motion-choreographer` |
| `pixel-atlas-production` | `pixel-asset-designer`, `pixel-art-quality-reviewer`, `pixel-asset-pipeline-engineer` | `web2d-asset-pipeline` |
| `level-layout-design` | `living-world-engineer`, `gameplay-balance-designer` | `world-geometry-specialist`, `level-designer` |
| `gameplay-implementation` | `realtime-arena-engineer`, `gameplay-balance-designer` | `gameplay-programmer` |
| `ui-runtime-components` | `identity-avatar-engineer`, `ux-accessibility-reviewer`, `ui-pixel-designer` | `ui-programmer` |
| `game-qa-automation` | `realtime-arena-engineer`, `ux-accessibility-reviewer`, `security-privacy-reviewer`, `integration-release-engineer` | `qa-lead`, `qa-tester` |
| `audio-direction-qa` | `art-director`, `audio-ambient-designer` | `audio-director` |

## Full internal role-to-skill routing (all 19)

| Internal role | Canonical skills that role should use |
| --- | --- |
| `orchestrator` | `agent-handoff-gate`, `release-evidence` |
| `meteo-methodologist-ru` | `russian-synoptic-acceptance`, `gameplay-determinism` |
| `meteo-verifier` | `russian-synoptic-acceptance`, `gameplay-determinism` |
| `live-kn01-engineer` | `live-kn01`, `realtime-server-authority` |
| `art-director` | `pixel-art-direction`, `pixel-art-qa`, `threejs-postprocessing`, `shader-art-direction`, `audio-direction-qa` |
| `pixel-asset-designer` | `pixel-art-direction`, `pixel-art-qa`, `threejs-assets`, `pixel-atlas-production`, `gltf-3d-pipeline` |
| `pixel-art-quality-reviewer` | `pixel-art-qa`, `pixel-asset-pipeline`, `pixel-atlas-production` |
| `pixel-asset-pipeline-engineer` | `pixel-asset-pipeline`, `threejs-assets`, `pixel-art-qa`, `gltf-3d-pipeline`, `pixel-atlas-production`, `asset-provenance-review` |
| `game-runtime-webgl-engineer` | `phaser-webgl-runtime`, `phaser4-scenes`, `phaser4-webgl`, `threejs-scene`, `threejs-postprocessing`, `glsl-webgl-shaders`, `threejs-architecture` |
| `living-world-engineer` | `living-world-browser`, `hub-nav-geometry`, `threejs-geometry`, `motion-choreography`, `level-layout-design` |
| `audio-ambient-designer` | `ambient-audio`, `audio-direction-qa`, `asset-provenance-review` |
| `web-performance-engineer` | `threejs-performance`, `release-evidence`, `glsl-webgl-shaders`, `gltf-3d-pipeline`, `shader-art-direction` |
| `realtime-arena-engineer` | `realtime-server-authority`, `gameplay-determinism`, `gameplay-implementation`, `game-qa-automation` |
| `identity-avatar-engineer` | `threejs-animation`, `ui-accessibility`, `security-privacy-review`, `motion-choreography`, `ui-runtime-components` |
| `gameplay-balance-designer` | `gameplay-determinism`, `gameplay-implementation`, `level-layout-design` |
| `ux-accessibility-reviewer` | `ui-accessibility`, `pixel-art-qa`, `ui-runtime-components`, `motion-choreography`, `game-qa-automation` |
| `security-privacy-reviewer` | `security-privacy-review`, `asset-provenance-review`, `game-qa-automation` |
| `integration-release-engineer` | `release-evidence`, `agent-handoff-gate`, `game-qa-automation`, `asset-provenance-review` |
| `ui-pixel-designer` | `ui-accessibility`, `pixel-art-direction`, `pixel-art-qa`, `ui-runtime-components`, `shader-art-direction` |

This mapping is serialized in the catalog. When changing it, update the catalog first; the validator checks all provider-specific preloads against it.

## Required distinctions

- **WebGL shader engineer** (`webgl-shader-specialist`) implements shader contracts and compilation; **shader artist** (`shader-artist`) plans and judges appearance. Art Director owns aesthetics, runtime engineer owns shader code. Both require independent GPU/performance checks.
- **Three.js architect** plans the renderer; `threejs-specialist` implements approved changes. Neither changes the accepted Phaser lifecycle, React shell or the `legacy2d` production default.
- **`web3d-asset-pipeline`** optimizes GLB textures/meshes; **`asset-pipeline-engineer`** verifies provenance and reproducibility. Both answer to the existing pixel asset pipeline owner, with different independent checks.
- **`level-designer`** plans wayfinding, POI layouts, readable entrances and player pacing; **`world-geometry-specialist`** validates ground footprints and collision-safe navigation. H3D files are not assumed to exist on `main`.
- **`qa-lead`** plans risk coverage and release-gate evidence; **`qa-tester`** executes/verifies individual cases. They cannot mark their own unscripted assumptions as a successful test.
- **`ui-programmer`** implements existing React interfaces; `ui-pixel-designer` is the canonical owner of visual UI rules and the UX role independently checks accessibility.
- **`audio-director`** reviews cue palettes and mix; `audio-ambient-designer` is the existing internal owner. Music or sound rights must be documented and no educational state can depend solely on audio.

## Provider behavior

| Provider | External and internal agent metadata | Skill registration |
| --- | --- | --- |
| Claude Code | `.claude/agents/*.md` YAML name, description, `skills` | `.claude/skills/*/SKILL.md` adapter preloaded by name; read canonical `.agents/skills` body |
| Antigravity | `.agents/agents/*.md` with `subagent: true`, project `skills: [skills/<id>]`; external helpers `mainAgent: false` | `.agents/skills/*/SKILL.md` canonical |
| Codex | `.codex/agents/*.toml`; `developer_instructions` directs to catalog + skill source; no unreviewed model/sandbox overrides | `.agents/skills/*/SKILL.md` canonical, discovered by metadata |

The preloading references are *configuration evidence*, not live runtime proof. Verify real launch/discovery in installed authenticated clients separately (see issue #100).

## Structural validation and safe smoke

Run `python tools/validate_agent_kit.py --json`, `python tools/validate_external_agent_matrix.py --json`, then the repository CI. The matrix validator checks each of 18 external entries has a real SHA, valid internal owner, independent reviewers and existing skills; every provider points to the same skills, and every canonical internal role's frontmatter matches its catalog assignments.

Suggested read-only smokes (separately in authenticated clients): delegate a GLSL shader inspection to `webgl-shader-specialist`, a source license review to `asset-pipeline-engineer`, and a regression plan to `qa-lead`. Check that the output cites branch/SHA, actual files and limits; **do not infer pass from files alone**.
