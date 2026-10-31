# BATCH-13 — Hub architecture modules aligned to Geometry Lock v1

Purpose: generate the architectural identity of the first/main Hub screen without allowing perspective or placement drift.

## Mandatory contract for every job

Attach accepted `hub.geometry.lock_v1` from BATCH-12 as **Image A** and the approved polished Hub style reference as **Image B**.

Every output in this batch is:

- exactly **640×360** full canvas;
- transparent RGBA except for the requested architecture pixels;
- origin fixed at `(0,0)`;
- **NOT trimmed**;
- aligned to Image A pixel-for-pixel as far as edit workflow allows;
- no terrain, sky, water, UI, labels, people or unrelated props unless physically integral to requested building;
- no re-centering, zooming or standalone asset composition.

Append this geometry-lock instruction to every generation:

> Image A is the accepted Hub Geometry Lock v1 and is authoritative for camera, horizon, object placement, footprint, roof pitch, scale and perspective. Keep the requested building exactly in its locked region on the full 640×360 canvas. Do not move, resize, rotate, recenter, zoom or redesign the campus. Output only the requested building pixels; every other pixel must be transparent. Do not trim the canvas.

Locked regions:

| Semantic zone | Region |
|---|---|
| Radar | `x=38..178, y=66..174` |
| Maps & Analysis | `x=34..208, y=145..287` |
| Synoptic Center | `x=205..433, y=111..264` |
| Aerology | `x=438..600, y=106..221` |
| Archive | `x=351..490, y=182..289` |
| Tournament Hall | `x=492..634, y=180..301` |
| Code Post / glass lab | `x=260..397, y=203..301` |
| Central globe/plaza object | `x=246..394, y=229..329` |

## JOB 13-01 — `hub.arch.radar_building`

Create exactly ONE full-canvas transparent architecture layer for the Radar building. Keep the entire building mass inside the locked Radar region and preserve its footprint from Image A. Compact scientific masonry building, pale geodesic/radome dome, rooftop antenna details, service windows, restrained technical lighting. Premium pixel clusters, cool stone/metal shadows, small warm windows. No forest, ground, sky, labels or UI. Full 640×360 canvas, transparent everywhere else, no trim.

## JOB 13-02 — `hub.arch.maps_analysis_pavilion`

Create exactly ONE full-canvas transparent architecture layer for Maps & Analysis. Keep mass/footprint inside the locked Maps & Analysis region. Modern glass-fronted analysis pavilion, blue-gray frame, warm interior volume, broad wall area suitable for runtime map screens, but NO readable synoptic graphics or text baked into art. Preserve exact camera and baseline. Full 640×360 canvas; everything outside structure transparent.

## JOB 13-03 — `hub.arch.synoptic_center`

Create exactly ONE full-canvas transparent architecture layer for the central Synoptic Center, the largest institutional mass. Keep exact locked region and footprint. Balanced classical/scientific facade, broad entrance stairs, warm operational windows, restrained weather-emblem mounting area without writing, small roof instruments. Do not alter stairs/path geometry. Full 640×360 canvas, transparent elsewhere.

## JOB 13-04 — `hub.arch.aerology`

Create exactly ONE full-canvas transparent architecture layer for Aerology in its locked region. Scientific upper-air identity: glass/metal bay, balloon-preparation cues, small platform/roof fittings, warm research interior. Preserve footprint, roof pitch and scale from Image A. No balloon outside the building layer unless physically attached. Full 640×360 canvas, transparent elsewhere.

## JOB 13-05 — `hub.arch.archive`

Create exactly ONE full-canvas transparent Archive building layer aligned to locked Archive region. Older scientific-library wing, masonry facade, tall warm windows, modest entrance, document-storage atmosphere, blue-gray roof. Avoid gothic/fantasy styling. Preserve footprint and roofline exactly. Full canvas, transparent elsewhere.

## JOB 13-06 — `hub.arch.tournament_hall`

Create exactly ONE full-canvas transparent Tournament Hall layer aligned to locked Tournament Hall region. Formal but non-militarized institutional hall, broad ceremonial entrance, trophy-emblem mounting area without text, tall warm windows and slightly stronger symmetry than other buildings. Do not move or enlarge beyond region. Full 640×360 canvas, transparent elsewhere.

## JOB 13-07 — `hub.arch.code_post_glass_lab`

Create exactly ONE full-canvas transparent Code Post / glass laboratory layer aligned to the locked region. Compact operations pavilion with glass roof/walls, communications fittings, visible warm control-room volume, practical scientific architecture. It should read as technical/operational without text. Preserve exact footprint and perspective. Full canvas, transparent elsewhere.

## JOB 13-08 — `hub.arch.central_globe_landmark`

Create exactly ONE full-canvas transparent central scientific globe/armillary landmark aligned to the locked central-globe region. Blue/brass globe with broad abstract continent masses, restrained armillary frame, low scientific plinth/fountain structure. Do not include plaza paving outside the object footprint. Full 640×360 canvas, transparent elsewhere.

## JOB 13-09 — `hub.arch.rooftop_instruments`

Create exactly ONE full-canvas transparent layer containing ONLY rooftop scientific instruments already implied by Image A: small radar dishes, antennas, wind sensors, radiation shield, cable boxes and compact mast structures. Keep each instrument in the exact corresponding rooftop position; do not repaint roofs/buildings themselves. Full 640×360 canvas, transparent elsewhere.

## JOB 13-10 — `hub.arch.shared_entrance_details`

Create exactly ONE full-canvas transparent layer containing ONLY reusable entrance details already positioned in Image A: restrained glass/metal canopies, small warm ceiling lamps, railings and institutional door surrounds where appropriate. Preserve exact placement. No signs, text, people or ground. Full canvas, transparent elsewhere.

## Acceptance

FAIL on any perspective drift, trimmed canvas, changed building footprint, changed horizon, baked labels/UI or standalone re-centering. PASS only when each layer can be stacked on `hub.geometry.lock_v1` at `(0,0)` with no CSS offsets and no manual scaling.