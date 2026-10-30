# BATCH-00 — Gold set

**Назначение:** откалибровать стиль до массовой генерации.  
**Исполнение:** 10 последовательных image-generation вызовов. Никогда не вставлять весь файл в один запрос.

## JOB 00-01 — `character.player.world.idle.down`

**Output:** `character_player_world_idle_down.png`

> Create exactly ONE standalone production game asset: the player character world sprite, idle, facing down/front. One subject only, one image only; never a set, contact sheet, sprite sheet, panel or variant board. Young meteorology trainee from a fictional North-West Russian scientific campus, compact readable silhouette, slightly oversized expressive head appropriate to a 32×48 logical world-character grid, dark-brown tousled hair, practical navy field jacket with small warm brass details, dark trousers, sturdy sneakers/boots, neutral attentive posture, arms relaxed. Modern polished pixel art: deliberate clusters, no random one-pixel noise, selective dark local-color outlines, cold navy/cyan shadow and restrained warm amber rim light. Feet must share one clear baseline; bottom-center anchor; leave transparent padding around all sides. Output a single RGBA PNG-style image with genuinely transparent background. No checkerboard, floor, cast-shadow plate, scenery, text, letters, numbers, logos, UI, watermark or additional poses.

## JOB 00-02 — `character.player.inventory.master`

**Output:** `character_player_inventory_master.png`

> Create exactly ONE standalone full-body inventory avatar for a polished modern pixel-art game. One character only and one image only; no variants or sprite sheet. Same young meteorology trainee identity as the world sprite but rendered at the richer `inventory_avatar` detail class: front-facing relaxed 3/4-neutral stance, full body visible head to shoes, dark-brown tousled hair, clean face, navy scientific-campus jacket over a light shirt, dark trousers, practical sneakers, small meteorological badge. The silhouette must be simple enough to become the immutable template for future clothing overlays: symmetric shoulder position, fixed hand positions, fixed waist and foot baseline, no bag and no held item. Use coherent intentional pixel clusters, selective local-color outline, cool navy/cyan shadows with warm amber key light, readable fabric folds without texture noise. Bottom-center anchor. Single genuine-transparent RGBA canvas only; no room, floor, halo, card, text, UI or extra accessories.

## JOB 00-03 — `portrait.mentor.neutral`

**Output:** `portrait_mentor_neutral.png`

> Create exactly ONE standalone transparent dialogue portrait for the game `26063: Позывной «Синоптик»`. One person only, one image only. A senior female synoptic meteorologist, approximately late 50s, calm intelligent face, kind but demanding eyes, subtle age lines, thin metal-frame glasses, dark-blond/ash hair with gray strands gathered neatly, practical dark-blue warm cardigan/jacket over a light shirt. Chest-up 3/4 view, neutral attentive expression suitable for explaining a task. Polished modern pixel illustration for a 256×320 logical portrait: controlled medium-size clusters, readable facial planes, no painterly blur, no random pixel freckles, selective local-color outlines. Cool navy/cyan shadow side, warm amber office light on face and shoulders. Keep identity distinctive and reproducible for later expression edits. Genuine transparent background with padding; no desk, speech bubble, text, logo, frame or second pose.

## JOB 00-04 — `companion.pascal.idle`

**Output:** `companion_pascal_idle.png`

> Create exactly ONE standalone companion sprite: Pascal, a plump fluffy ginger-and-white station cat, idle sitting pose, 3/4 front view. One animal only, one image only. White chest and muzzle, warm ginger back and tail, green eyes, pink nose, small notch on the tip of the left ear; cozy but observant personality. Target a readable 48×48 logical companion sprite: strong cat silhouette first, tail shape clearly separated, 24–48 purposeful colors rather than hard quantization, clustered fur masses instead of individual hair noise, selective dark-russet/local-color outline, warm amber highlights and cool navy reflected shadows. Bottom-center baseline and transparent padding. Return a single genuine-transparent RGBA image. No cushion, teletype, floor, card, checkerboard, text, label, watermark, duplicate animal or alternate pose.

## JOB 00-05 — `companion.tit.idle`

**Output:** `companion_tit_idle.png`

> Create exactly ONE standalone companion sprite: a great-tit-inspired small station bird used as the player companion, idle standing/perched-on-invisible-baseline pose, 3/4 view. One bird only. Readable yellow belly, black head and bib, white cheek patches, blue-gray wing and tail accents; friendly alert posture. Design for a 48×48 logical sprite with deliberate clusters, compact silhouette, clean beak/feet shapes, no feather-by-feather noise, no fuzzy antialias halo, local-color outline with cool navy shadow and restrained warm light. Bottom-center anchor; leave transparent padding and keep every visible pixel inside canvas. Single RGBA transparent image only. No branch, cage, card, scenery, text, heart icon, label, sprite sheet, second bird or variant.

## JOB 00-06 — `prop.meteo.anemometer.handheld`

**Output:** `prop_meteo_anemometer_handheld.png`

> Create exactly ONE standalone handheld cup anemometer game prop inspired by classic field meteorological instruments. One object only. Compact mechanical body with three clearly readable cups on arms, small analog/mechanical counter housing and practical grip; believable instrument rather than sci-fi gadget. 3/4 top/front view, centered. Pixel-art prop designed to reduce cleanly to a 64×64 logical grid: strong silhouette, readable metal/plastic material separation, grouped highlights, no tiny decorative noise, selective navy-brown outline. Cool steel-blue shadows with a small warm brass/amber accent consistent with the 26063 campus palette. Single genuine-transparent RGBA canvas; no hand, table, pedestal, card, text, numbers on dial, checkerboard, duplicate instrument or extra tools.

## JOB 00-07 — `prop.meteo.front_pencil`

**Output:** `prop_meteo_front_pencil.png`

> Create exactly ONE standalone red-and-blue double-ended synoptic pencil used to mark warm and cold fronts. One object only, diagonally oriented from lower-left to upper-right, centered with generous transparent padding. Wooden hexagonal pencil body, one red end and one blue end, sharpened colored leads, modest worn-working-tool character, no brand text. Polished 64×64 logical pixel-art prop: crisp stepped diagonals, deliberate color clusters, readable wood/paint separation, selective local-color outline, cool shadow edge and warm amber highlight. Do not exaggerate into a magic wand. Single transparent RGBA image only; no notebook, hand, desk, card, labels, letters, checkerboard, sprite sheet, second pencil or variants.

## JOB 00-08 — `vegetation.nw.pine.medium`

**Output:** `vegetation_nw_pine_medium.png`

> Create exactly ONE standalone medium conifer/pine sprite suitable for a North-West Russian / St Petersburg-inspired meteorological campus. One tree only, full trunk-to-crown silhouette, slightly wind-shaped rather than perfectly symmetric. Target 64×96 logical pixel art: crown built from intentional needle-mass clusters, not noisy individual needles; several deep blue-green shadow groups, muted forest-green mids and limited cool dusk highlights; subtle warm reflected light only on the campus-facing side. Trunk visible enough to establish scale. Strong readable silhouette and bottom-center ground anchor. Genuine transparent RGBA background and transparent spacing around branches. No ground island, grass patch, pot, snow unless requested, scenery, text, birds, second tree or contact sheet.

## JOB 00-09 — `prop.hub.lamp.warm`

**Output:** `prop_hub_lamp_warm.png`

> Create exactly ONE standalone outdoor campus lamp sprite, one object only. Human-scale dark painted metal post with compact classic scientific-campus fixture, not ornate fantasy Victorian; warm amber bulb/glow contained inside the fixture, sturdy base, slightly weathered from coastal climate. Full object, 3/4 view consistent with the Hub camera. Pixel-art prop for a 48×80 logical grid: clean silhouette, coherent stepped curves, metal highlighted in small grouped clusters, dark navy outline/shadow, warm amber luminous core without a huge soft airbrush halo. Bottom-center anchor. Transparent RGBA canvas only; no pavement, bench, plant, building, text, duplicate lamp or glow background. Keep any emissive glow tight enough to composite over a separate scene.

## JOB 00-10 — `scene.hub.geometry_master.dusk`

**Output:** `scene_hub_geometry_master_dusk.png`

> Create exactly ONE 16:9 polished pixel-art master scene for the main meteorological campus Hub. This is one scene, not a collage and not multiple panels. Fictional North-West/St Petersburg-inspired scientific campus at blue-hour/dusk: low horizon, water and distant urban shoreline, layered Baltic cloudiness, conifers and deciduous vegetation, central synoptic-center building, distinct radar dome wing, map/analysis wing, aerology glasshouse, archive and tournament hall. Warm inhabited windows contrast with cool navy/blue-violet atmosphere. Preserve broad open circulation paths and a central plaza; include credible instruments such as masts/dishes/balloon infrastructure but do not overload. No Alpine permanent mountain range. Reserve clean safe zones at top and bottom for live React UI. Do NOT draw labels, Russian text, buttons, status bars, levels, energy, icons, maps with fake professional fronts, or baked interaction outlines. Modern high-quality pixel illustration with intentional clusters and material readability. Opaque scene background is correct for this job.

## Gate после BATCH-00

Не переходить к BATCH-01, пока:

- `pixel-art-quality-reviewer` не подтвердил grid/cluster/alpha/pivot;
- `art-director` не подтвердил character identity, palette/light и scene language;
- 00-02 не принят как immutable avatar silhouette template;
- 00-03 не принят как immutable mentor identity master;
- 00-10 не принят как geometry master хаба.
