# Pixel-art visual baseline

Status: `accepted-art-direction`

This directory contains the fixed visual reference screens for **Synoptic Center**. They are art-direction anchors for mood, hierarchy, density, environmental life and recurring UI language.

| File | Screen | What it fixes |
|---|---|---|
| [`01_hub.webp`](01_hub.webp) | Synoptic Center hub | world, campus, primary CTA, warm/cool lighting |
| [`02_blitz.webp`](02_blitz.webp) | Blitz | short-task focus, streak, timer, assistant reaction |
| [`03_duel.webp`](03_duel.webp) | Synoptic Duel | realtime PvP, Reliability/OR, parry/counter language |
| [`04_inventory.webp`](04_inventory.webp) | Synoptician inventory | character, tools, cosmetics, collection UX |
| [`05_tournament.webp`](05_tournament.webp) | Tournament hall | spectator/projector/broadcast composition |
| [`06_progression.webp`](06_progression.webp) | Seasonal progression | mastery, career path, room unlocks, rewards |

## Implementation rule

These concepts are **not** intended to be shipped as full-screen raster backgrounds. Production UI should be reconstructed from reusable components:

- CSS/SVG UI shapes;
- Canvas/WebGL map layers;
- authored sprite sheets;
- reusable environmental tiles;
- small looping animations;
- design tokens for game UI and meteorological semantics.

This keeps the game responsive and allows new screens to be added without generative imagery.

Detailed rules: [`docs/design/PIXEL_ART_STYLE_GUIDE.md`](../../docs/design/PIXEL_ART_STYLE_GUIDE.md).
