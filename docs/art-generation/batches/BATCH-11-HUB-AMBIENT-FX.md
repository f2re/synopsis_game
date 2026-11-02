# BATCH-11 — Hub ambient depth / weather support layers

Purpose: оживить Hub независимыми облачными, водными, световыми и атмосферными слоями без замены `hub.geometry.lock_v1`.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and must be generated separately. Legacy 480×270 scene-aligned outputs are forbidden; all scene-aligned overlays now use the canonical `640×360` canvas.

## Shared constants

- Geometry authority: accepted `hub.geometry.lock_v1`.
- Scene-aligned outputs: exactly `640×360`, origin `(0,0)`, true transparent RGBA, never trim.
- Isolated clouds/particles use declared logical size and center pivot.
- Effects remain subtle enough for study mode and must not compete with task CTA/hotspots.
- No architecture, labels, text or UI may be baked into effect layers.
- Pixel treatment: crisp clustered shapes and controlled dithering; no Gaussian blur, vector smoothness or photographic effects.

---

## JOB 11-01 — `ambient.cloud.far_stratus`

### References
- **Image A:** `hub.geometry.lock_v1` for sky scale/horizon.
- **Image B:** accepted cloud style/palette reference from the Hub target.

### Output contract
Exactly ONE isolated transparent RGBA cloud sprite, logical size `160×48`, center pivot. One cloud bank only.

### Generation prompt
Create a distant low elongated stratus/stratocumulus cloud bank for slow parallax behind the distant city. Use a horizontally stretched silhouette with several broad shallow layers, pale blue-gray mids, cool violet/navy underside clusters and very low contrast appropriate to far distance. Keep the form meteorologically plausible for a North-West/Baltic sky, avoiding cartoon puffs. The asset should tile visually with open sky on both sides and remain secondary to skyline/campus. Output exactly one isolated cloud sprite with real transparency.

### Hard negatives
No sky fill, sun, rain, birds, city, text/UI, fluffy cartoon outline, towering cumulonimbus, smooth blur, second cloud option, contact sheet/sprite sheet/grid/collage or checkerboard.

### PASS / FAIL
Cloud too dark/foreground-like, overly fluffy/fantasy silhouette, background pixels, multiple variants or unclear center pivot = FAIL.

---

## JOB 11-02 — `ambient.cloud.mid_cumulus`

### References
- **Image A:** accepted Hub master for atmospheric palette/scale.
- **Image B:** accepted far-cloud sprite for cluster-language consistency.

### Output contract
Exactly ONE isolated transparent RGBA cloud sprite, logical size `128×64`, center pivot.

### Generation prompt
Create one mid-distance compact cumulus/stratocumulus cloud mass suitable for a slow parallax layer. Use 3–5 broad lobes with a restrained cream/cool highlight edge and blue-violet underside, rendered as stepped intentional pixel clusters rather than smooth painterly volume. The cloud should have slightly more contrast than far stratus but remain visually behind architecture. Keep silhouette horizontally balanced and reusable under several day-phase tints. Output one isolated sprite only.

### Hard negatives
No sky background, lightning, rain, birds, fantasy tower, smooth airbrush shading, text/UI, extra cloud variant, contact sheet/grid/collage/options.

### PASS / FAIL
Style mismatch with far layer, overly high contrast, blurry edge, background pixels or multiple clouds presented as options = FAIL.

---

## JOB 11-03 — `ambient.cloud.near_broken`

### References
- **Image A:** Hub master for sky composition and contrast hierarchy.
- **Image B:** accepted 11-01/11-02 cloud family.

### Output contract
Exactly ONE isolated transparent RGBA broken-cloud group, logical size `144×64`, center pivot.

### Generation prompt
Create one nearer broken-cloud group intended for a slightly faster parallax layer. Use an elongated irregular cluster of separated but visually related cloud pieces, with somewhat stronger cool shadow and clearer highlight contrast than the far/mid layers. Preserve the same premium stepped pixel language and avoid excessive local detail. The group should remain compact enough to travel through sky-safe areas without covering major architecture for long periods. Output exactly one transparent group sprite.

### Hard negatives
No birds, precipitation, lightning, sky fill, giant foreground cloud, contact sheet/sprite sheet/grid/collage/options, text/UI, blur or photoreal volumetrics.

### PASS / FAIL
Cloud family mismatch, excessive opacity/scale, too many tiny fragments, non-transparent background or multi-variant output = FAIL.

---

## JOB 11-04 — `ambient.water.glint_layer`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for exact water region.
- **Image B:** accepted BATCH-12 water base/reflection layer for palette and source alignment.

### Output contract
Exactly ONE `640×360` transparent RGBA scene-aligned overlay at `(0,0)`, never trimmed. Only river glint/ripple highlight pixels visible.

### Generation prompt
Create a restrained water-glint overlay confined exactly to the accepted river polygon. Use short horizontal pixel clusters with perspective compression toward the horizon, sparse cool cyan/blue-white highlights and a few warm accents where accepted sky/city light would plausibly reflect. Keep density low enough for later opacity or discrete-offset animation and leave large areas transparent. Do not repaint the water base or shoreline. Output exactly one full-canvas aligned overlay.

### Hard negatives
No shoreline, city, building, boat, solid water fill, foam, rain streaks, UI/text, blur, pixels outside water mask, contact sheet/collage/options.

### PASS / FAIL
Any effect pixel outside accepted water region, excessive sparkle/noise, opaque base fill or origin/canvas mismatch = FAIL.

---

## JOB 11-05 — `ambient.windows.warm_mask`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted BATCH-13 architecture/window coordinates.

### Output contract
Exactly ONE `640×360` transparent RGBA warm-window activity mask at `(0,0)`, never trimmed. Only existing window pixels may be visible.

### Generation prompt
Create a reusable ambient warm-window mask by selecting a plausible subset of already-existing campus windows and grouping them into 3–4 logical room clusters for deterministic on/off cycles. Use compact amber/yellow pixel clusters with modest intensity variation while preserving each accepted window opening’s exact position and shape. No wall/frame pixels should be copied. The mask should support subtle living-world activity over tens of seconds without creating random flicker. Output one transparent full-canvas layer only.

### Hard negatives
No new/moved windows, facade/roof pixels, readable interiors/text, broad glow halo, random sparkle, UI, contact sheet/grid/collage/options.

### PASS / FAIL
Light outside accepted window openings, new window geometry, copied architecture, excessive brightness or canvas/origin mismatch = FAIL.

---

## JOB 11-06 — `ambient.lamps.glow_mask`

### References
- **Image A:** `hub.geometry.lock_v1` for lamp anchors.
- **Image B:** accepted physical lamp assets/positions and dusk lighting palette.

### Output contract
Exactly ONE `640×360` transparent RGBA scene-aligned glow mask at `(0,0)`, never trimmed. Glow/reflection pixels only; no lamp geometry.

### Generation prompt
Create restrained warm local lamp illumination around the accepted campus/foreground lamp positions. Use compact amber cores, stepped pixel-cluster falloff and tiny reflected highlights on immediately adjacent accepted surfaces, with no smooth airbrush halo. Keep every glow physically anchored to an existing lamp and small enough not to cross heavily into neighbouring hotspots or UI-safe regions. The physical lamp bodies remain transparent in this layer. Output exactly one aligned overlay.

### Hard negatives
No new lamp, no lamp-post pixels, no giant soft halo, no whole-ground wash, no text/UI, no blur, no misaligned light source, no contact sheet/collage/options.

### PASS / FAIL
Glow-source misalignment >1–2 px, oversized radius, copied lamp geometry, effect outside plausible local surfaces or wrong canvas = FAIL.

---

## JOB 11-07 — `ambient.foliage.wind_overlay`

### References
- **Image A:** `hub.geometry.lock_v1` for vegetation anchors.
- **Image B:** accepted current-season vegetation layer.

### Output contract
Exactly ONE `640×360` transparent RGBA aligned overlay at `(0,0)`, never trimmed. Only selected secondary foliage clusters intended for tiny movement may be visible.

### Generation prompt
Create a foliage-wind support overlay containing only small secondary leaf/needle clusters on selected foreground and midground trees/bushes. Choose clusters whose movement by approximately 1–2 logical pixels can imply a slow breeze while the main trunk/canopy mass remains fixed in the base vegetation layer. Match the currently accepted seasonal palette and lighting exactly, using broad coherent clusters rather than leaf confetti. Output one sparse full-canvas transparent overlay.

### Hard negatives
No whole tree/canopy repaint, no trunk, ground or building pixels, no falling leaves in this job, no random full-scene foliage noise, no text/UI, no contact sheet/collage.

### PASS / FAIL
Overlay duplicates major canopy mass, moving clusters are too large/noisy, anchors are unclear or non-vegetation pixels appear = FAIL.

---

## JOB 11-08 — `ambient.leaves.falling_group`

### References
- **Image A:** accepted autumn vegetation palette/style.
- **Image B:** Hub master for world/foreground scale.

### Output contract
Exactly ONE isolated transparent RGBA particle-group sprite, logical size `96×96`, center pivot. One group of 8–12 leaves.

### Generation prompt
Create one reusable ambient group of approximately 8–12 falling autumn leaves at varied spacing/orientation. Each leaf should be only a few logical pixels, using muted amber/ochre/rust/brown clusters consistent with accepted autumn foliage. Arrange the group with clear transparent gaps so runtime translation/rotation does not become a dense block. Keep leaves simple and readable; no branch or background. Output exactly one particle-group asset.

### Hard negatives
No tree/branch, ground, wind streaks, hundreds of leaves, text/UI, multiple group variants, contact sheet/sprite sheet/grid/collage/options or checkerboard.

### PASS / FAIL
Group too dense/noisy, leaf colors inconsistent with autumn palette, background pixels or more than one variant = FAIL.

---

## JOB 11-09 — `ambient.rain.light_layer`

### References
- **Image A:** `hub.geometry.lock_v1` for full-scene depth and interaction-safe areas.
- **Image B:** accepted cool weather palette if available.

### Output contract
Exactly ONE `640×360` transparent RGBA scene-aligned light-rain overlay at `(0,0)`, no trim.

### Generation prompt
Create a sparse light-rain particle layer suitable for the calm/study Hub profile. Use short diagonal cool-gray/blue-white streak clusters with depth variation: smaller/denser far away and a few slightly longer foreground streaks. Intentionally reduce density over central interaction/CTA-safe zones and important building labels. This job contains particles only; no wet-surface darkening, fog or cloud fill. Use crisp pixel strokes without motion blur. Output exactly one aligned overlay.

### Hard negatives
No fog wash, ground darkening, puddles, clouds, giant streaks, blur, architecture, text/UI, contact sheet/grid/collage/options.

### PASS / FAIL
Rain obscures interaction zones, contains unrelated weather effects, uses smooth blur or fails full-canvas `(0,0)` alignment = FAIL.

---

## JOB 11-10 — `ambient.mist.river_layer`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for water/far-ground depth.
- **Image B:** accepted depth-haze layer for pixel/dither language.

### Output contract
Exactly ONE `640×360` transparent RGBA low-mist overlay at `(0,0)`, never trimmed.

### Generation prompt
Create a thin low river/campus mist layer concentrated over the accepted water region and selected low ground/far-campus areas. Use cool blue-gray broad pixel clusters and controlled patterned transparency, strongest near the water and weakest in the foreground. Preserve building silhouettes, route visibility and label/CTA readability; the mist should suggest morning/evening humidity rather than a dense fog event. Output exactly one aligned transparent overlay.

### Hard negatives
No Gaussian blur, white fog wall, full-frame wash, architecture/water repaint, new clouds, text/UI, contact sheet/collage/options or canvas trim.

### PASS / FAIL
Foreground/hotspot readability loss, non-pixel blur, geometry contamination, excessive opacity or incorrect 640×360 origin = FAIL.

---

## Runtime / batch acceptance

- legacy 480×270 outputs are rejected; scene overlays are canonical 640×360 `(0,0)`;
- removing every layer restores the exact base scene;
- clouds use slow parallax; windows use seeded 20–90 s changes; foliage uses low-frequency 1–2 px movement; rain/mist remain separate weather-state effects;
- reduced-motion freezes/suppresses motion while preserving a complete static state;
- no effect contains architecture/text/UI;
- all candidates pass pixel cleanup, provenance/manifest registration and independent art/runtime review before production use.
