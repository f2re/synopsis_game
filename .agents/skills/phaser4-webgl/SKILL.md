---
name: phaser4-webgl
description: "Phaser 4 rendering, filters, render nodes and pixel-scaled WebGL integration"
---

# phaser4-webgl

Inspect installed Phaser 4.2.1 APIs and the official Phaser 4 new-features guide before editing. Preserve the existing Phaser + Three canvas ownership. Phaser v3 pipelines and removed FX APIs are not a valid shortcut. Check nearest-neighbour scaling, 480×270 legacy scenes vs 640×360 Hub, the 320×180 3D target, texture filtering, transparency, draw ordering and DPR. Validate context loss/restore; diagnostics must distinguish CPU frame timing from actual GPU timing. Require a browser smoke and independent web-performance review.

Upstream research reference (not a runtime dependency): https://github.com/phaserjs/phaser/blob/main/skills/v4-new-features/SKILL.md

Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
