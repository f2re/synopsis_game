# Pixel-art visual references

Status: `composition-reference / legacy-branding`

This directory contains the earlier visual reference screens for **26063: Позывной «Синоптик»**. They remain useful only as art-direction anchors for mood, hierarchy, density, environmental life and recurring UI language.

The images were created before the `26063` brand and St Petersburg / North-West lore were fixed. Any embedded old title, Alpine geography or conflicting signage is **not** canonical and must not be copied into production assets.

| File | Screen | What may still be reused |
|---|---|---|
| [`01_hub.webp`](01_hub.webp) | early Hub concept | composition hierarchy, clear locations, primary CTA; old title/geography are obsolete |
| [`02_blitz.webp`](02_blitz.webp) | Blitz | short-task focus, streak, timer, assistant reaction; old branding is obsolete |
| [`03_duel.webp`](03_duel.webp) | Synoptic Duel | realtime PvP, Reliability/OR, parry/counter language; old branding is obsolete |
| [`04_inventory.webp`](04_inventory.webp) | Synoptician inventory | character, tools, cosmetics, collection UX; old branding is obsolete |
| [`05_tournament.webp`](05_tournament.webp) | Tournament hall | spectator/projector/broadcast composition; old branding is obsolete |
| [`06_progression.webp`](06_progression.webp) | Seasonal progression | mastery, career path, room unlocks, rewards; old branding is obsolete |

## Canonical references

For new art, use these documents before the raster references above:

1. [`docs/BRAND_AND_LORE_26063.md`](../../docs/BRAND_AND_LORE_26063.md);
2. [`docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`](../../docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md);
3. [`docs/design/PIXEL_ART_STYLE_GUIDE.md`](../../docs/design/PIXEL_ART_STYLE_GUIDE.md);
4. the currently accepted `ART-BATCH-*` review.

## Implementation rule

These concepts are **not** intended to be shipped as full-screen raster backgrounds. Production UI should be reconstructed from reusable components:

- CSS/SVG UI shapes;
- Canvas/WebGL map layers;
- authored sprite sheets;
- reusable environmental tiles;
- small looping animations;
- design tokens for game UI and meteorological semantics.

The title/logo is a separate graphic layer. It must not be baked into reusable Hub backgrounds.

This keeps the game responsive and allows new screens to be added without generative imagery.
