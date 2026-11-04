---
name: phaser4-scenes
description: "Phaser 4 scenes, lifecycle and Phaser/Three input ownership in synopsis_game"
---

# phaser4-scenes

Inspect `packages/world-engine/src/scenes/` and `runtime/createWorldGame.ts`. Read the pinned Phaser version and the upstream Phaser 4 scenes guide. Keep Phaser the lifecycle/input owner of the living world, and React the application shell. Three.js may render only the accepted Hub feature-flag path; never create a second global game loop. Maintain scene-local teardown, pause/resume, event listener cleanup and idempotent mount/unmount. Keep progression and answer authority outside scene objects. Verify legacy2d and experimental three2d, pointer input, resize, and offscreen transitions. Never replace the project scene hierarchy with a generic Phaser starter.

Upstream research reference (not a runtime dependency): https://github.com/phaserjs/phaser/blob/c90c5e8b26993e6cd726ab8c4f36e4129cbf277d/skills/scenes/SKILL.md

Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
