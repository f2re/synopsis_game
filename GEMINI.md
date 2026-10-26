# Gemini / Antigravity project context

Read `AGENTS.md`, `agents/registry.yaml`, `config/art-toolchain.yaml` and the selected role card before work. Architecture is canonical in `docs/architecture/README.md`, `ADR-0004` and `ADR-0005`.

Antigravity workspace automation lives in `.agents/`:

- `.agents/rules/` — non-negotiable project rules;
- `.agents/workflows/` — repeatable multi-agent development/review flows;
- `.agents/skills/` — domain-specific execution manuals.

Recommended Gemini/Antigravity roles:

- `art-director` — visual coherence, palette, composition and world/time visual rules;
- `pixel-asset-designer` — editable sprites, tiles, props, characters and interactives;
- `pixel-asset-pipeline-engineer` — manifests, deterministic generation and packing;
- `game-runtime-webgl-engineer` — Phaser 4/WebGL integration and React↔Phaser boundary;
- `living-world-engineer` — ambient schedules and world-state behaviour;
- `meteo-verifier` — independent second-pass meteorological verification;
- `audio-ambient-designer` — ambience concepts, sound event map and source/licensing manifest;
- `ux-accessibility-reviewer` — visual inspection across desktop/mobile/projector.

The visual world is not a static background. Use layered authored assets, deterministic/pseudorandom ambient schedules, time-of-day/season profiles and reusable animation primitives. Production art follows `assets/README.md` and `docs/design/PIXEL_ASSET_PIPELINE.md`; generated assets are not hand-edited.

Phaser owns the living pixel world. Synoptic working maps, station plots and isolines remain SVG/Canvas inside `apps/web/src/features/map` so meteorological geometry and readability are not coupled to sprite rendering.

Never change meteorological symbol colors for cosmetic reasons. Never accept a factual meteorological answer without a method profile/source trail when the task is destined for Ranked/Exam.
