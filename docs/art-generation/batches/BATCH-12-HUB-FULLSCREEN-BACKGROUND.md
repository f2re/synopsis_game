# BATCH-12 — Hub canonical fullscreen master + background layers

Status: **GEOMETRY LOCK v1**. This batch is authoritative for the first/main Hub screen.

The purpose of this batch is not merely to make a prettier background. It fixes the camera, horizon, object layout, scale, crop policy and scene proportions so every later season, weather state, day phase, building overlay, NPC route and foreground asset can be composited without geometry drift.

## 0. Non-negotiable scene contract

All full-scene outputs use the same logical canvas:

- canvas: **640×360 px**;
- origin: top-left `(0,0)`;
- aspect ratio: **16:9**;
- runtime mode: full viewport `100vw × 100vh` using uniform `cover`, never independent X/Y stretching;
- canonical safe zone for important gameplay architecture: **x=48..592, y=42..315**;
- top HUD may cover approximately `y=0..42`; background still extends behind it;
- bottom navigation may cover approximately `y=315..360`; background still extends behind it;
- crop at extreme left/right/top/bottom is acceptable; critical objects must remain inside safe zone;
- do not trim full-scene transparent layers;
- all aligned layers keep exact canvas 640×360 and exact origin `(0,0)`.

### Camera lock

- fixed elevated wide camera, slightly top-down;
- NOT isometric, NOT fisheye, NOT cinematic tilted camera;
- vertical building edges remain vertical;
- approximate visual vanishing focus: `(320,100)`;
- visible roof depth: approximately 20–30% of building height;
- horizon line: **y=92 ±2 px**;
- distant water band: approximately **y=92..147**;
- main campus architecture occupies approximately **y=108..294**;
- foreground framing occupies approximately **y=274..360**;
- no zoom/reframe/recenter between variants.

### Locked semantic regions

These regions are authoritative placement guides for later full-canvas overlays. They are not clipping boxes; decorative details may extend slightly outside them, but the mass and footprint must remain stable.

| Semantic zone | Locked region on 640×360 canvas |
|---|---|
| `radar` | `x=38..178, y=66..174` |
| `maps_analysis` | `x=34..208, y=145..287` |
| `synoptic_center` | `x=205..433, y=111..264` |
| `aerology` | `x=438..600, y=106..221` |
| `archive` | `x=351..490, y=182..289` |
| `tournament_hall` | `x=492..634, y=180..301` |
| `code_post_glass_lab` | `x=260..397, y=203..301` |
| `central_globe_plaza` | `x=246..394, y=229..329` |
| `foreground_railing` | mostly `y=286..352` |

### Geometry-lock language appended to every edit prompt

> Image A is the accepted Hub Geometry Lock v1 and is authoritative for camera, horizon, object placement, scale, footprint, roof pitch, path geometry and crop. Preserve geometry pixel-for-pixel as far as the edit workflow allows. Do not redesign, recenter, zoom, rotate, widen, narrow, move, add or remove buildings. Do not alter the horizon. Do not change path positions. Generate only the requested layer/state.

### Style lock

Modern premium pixel-art game background: crisp intentional pixel clusters; coherent cluster sizes across the entire scene; no photographic blur; no painterly smearing; no random single-pixel noise; no vector-smooth edges; controlled palette; atmospheric depth; North-West / St Petersburg scientific-campus mood; professional but cozy; cool blue/navy ambient shadows with restrained warm amber operational lights. No UI, labels, level badges or readable text inside art layers.

---

## JOB 12-01 — `hub.geometry.lock_v1`

Create exactly ONE canonical full-screen pixel-art geometry master for the main Hub, canvas exactly 640×360. This job establishes composition and must be accepted before every other Hub generation.

Scene structure:
- horizon at y≈92;
- river/city in the far background;
- scientific campus occupies middle and lower screen;
- Radar mass in locked radar region;
- Maps & Analysis pavilion in locked maps_analysis region;
- largest Synoptic Center mass in locked synoptic_center region;
- Aerology mass in locked aerology region;
- Archive mass in locked archive region;
- Tournament Hall mass in locked tournament_hall region;
- Code Post / glass lab in locked code_post_glass_lab region;
- central scientific globe/plaza in locked central_globe_plaza region;
- nearest railing/vegetation frames the bottom foreground but does not obscure the central plaza.

This is a polished scene, not wireframe, but geometry consistency is more important than decorative detail. Use calm dusk/golden-hour-neutral lighting so later overlays can shift day phase. No UI, labels, text, badges, navigation, character portraits or black margins. Important buildings remain inside safe zone. Output exactly one opaque 640×360 image.

## JOB 12-02 — `hub.bg.sky.base`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE opaque 640×360 base-sky layer. Preserve horizon at y≈92 and full camera framing. Output sky only: cool blue upper sky, restrained violet/cyan transition, mild warm near-horizon band. No clouds, sun, moon, city, water, campus, birds, UI or text. Geometry/canvas must remain identical to Image A.

## JOB 12-03 — `hub.bg.clouds.far`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA far-cloud layer aligned to Image A. Only distant stratocumulus/cumulus banks around and above the horizon, mostly y=35..105. Large coherent pixel clusters, meteorologically plausible forms, no fantasy cloud towers. All other pixels transparent. No city, water, campus, UI or text. Do not trim or recenter.

## JOB 12-04 — `hub.bg.clouds.mid`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA middle-cloud layer, aligned pixel-for-pixel with Image A. 3–5 larger cloud masses mainly y=10..105, leaving visual breathing space above the central campus. These clouds are designed for slow parallax and must not cover critical architecture. No sky fill, city, birds, UI or text. Do not trim.

## JOB 12-05 — `hub.bg.city_skyline`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA distant city skyline layer aligned to the locked horizon. The city must occupy only the distant band around y≈77..123: restrained St Petersburg/North-West-inspired silhouettes, spires, domes, low institutional blocks and distant residential rhythm. Scientific-game fiction, not literal landmark collage. No campus buildings, water fill, foreground vegetation, UI or text. Preserve skyline baseline and scale exactly.

## JOB 12-06 — `hub.bg.water.base`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA water layer matching the locked river band approximately y=92..147. Perspective-compressed pixel ripples, cool cobalt/blue-gray base, subtle broad color variation. No city, boats, campus, vegetation, UI or text. Water position must match Image A exactly; all non-water pixels transparent.

## JOB 12-07 — `hub.bg.water.reflections`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA reflection-only layer aligned to the exact locked water band. Broken vertical/diagonal pixel clusters corresponding to distant city and warm lamps, sparse amber/cyan highlights, perspective compressed toward horizon. No solid water fill, no boats, no buildings, no UI. Preserve exact canvas/origin.

## JOB 12-08 — `hub.bg.campus_ground`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA campus-ground layer containing only paths, stairs, terraces, low retaining walls, lawn/soil masses and plaza surfaces. Preserve all path intersections and central-plaza footprint from Image A. No buildings, trees, lamps, people, UI or text. This geometry is season-neutral; do not bake autumn leaves or snow into it.

## JOB 12-09 — `hub.bg.depth_haze`

Use accepted `hub.geometry.lock_v1` as Image A. Create exactly ONE 640×360 transparent RGBA atmospheric depth layer: subtle blue-violet haze separating skyline, water and campus. Controlled broad pixel dithering only, no Gaussian-blur look. Keep near foreground clear. No geometry, objects, text or UI. Preserve exact canvas/origin.

## JOB 12-10 — `hub.reference.dusk_composite_v1`

Use accepted `hub.geometry.lock_v1` as Image A and do NOT change its geometry. Create exactly ONE polished composite reference for the canonical dusk/golden-hour appearance. Same camera, same horizon, same locked building regions, same paths, same plaza and same crop. Increase only art quality: richer material clusters, controlled North-West vegetation, warm operational windows, cool atmospheric shadows, detailed but coherent water/city depth. No UI, labels, text, badges or navigation. This image is a visual QA target, not a separate geometry source.

---

## Acceptance gate

FAIL if any of the following occurs:

- horizon moves by more than 2 logical pixels;
- any major building mass shifts outside its locked semantic region;
- camera angle, zoom or crop changes;
- central plaza/path network changes between 12-01 and 12-10;
- full-scene transparent layers are trimmed;
- black/empty margins are introduced;
- UI/text/labels are baked into art;
- pixel style changes into painterly, vector or photorealistic rendering;
- runtime would require non-uniform stretching.

PASS requires `hub.geometry.lock_v1` to be approved and reused as Image A for every later Hub state/season/weather generation.