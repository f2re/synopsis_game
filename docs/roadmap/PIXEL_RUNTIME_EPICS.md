# Pixel runtime and asset pipeline epics

**Status:** accepted for implementation

| Task | Owner | Acceptance reviewers |
|---|---|---|
| ENGINE-001 Phaser package/runtime scaffold | `game-runtime-webgl-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ENGINE-002 React↔Phaser mount/lifecycle bridge | `game-runtime-webgl-engineer` | `web-performance-engineer`, `ux-accessibility-reviewer` |
| ENGINE-003 pixel sampling/scaling/camera contract | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |
| ENGINE-004 scene/layer/tween/animation primitives | `game-runtime-webgl-engineer` | `living-world-engineer`, `web-performance-engineer` |
| ENGINE-005 filter/shader/particle policy | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |
| ASSET-001 source tree/naming/manifest schema | `pixel-asset-pipeline-engineer` | `pixel-asset-designer`, `art-director` |
| ASSET-002 sprite-tools lint/metadata pipeline | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-003 AssetPack optimisation/atlas pipeline | `pixel-asset-pipeline-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ASSET-004 Tiled scene contract | `pixel-asset-pipeline-engineer` | `game-runtime-webgl-engineer`, `living-world-engineer`, `art-director` |
| ASSET-005 provenance/build reproducibility | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-006 visual/runtime regression fixtures | `integration-release-engineer` | `art-director`, `web-performance-engineer` |

WORLD tasks use these ENGINE/ASSET foundations; they must not duplicate renderer or pipeline ownership.
