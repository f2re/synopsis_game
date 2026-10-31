# BATCH-14 — Hub foreground and gameplay objects

Purpose: собрать передний план и игровые объекты, которые создают глубину, маршруты и интерактивность поверх архитектуры.

## Global rule

Exactly ONE asset per generation, transparent RGBA, no contact sheet, no text/UI. Match approved Hub style and 3/4 camera. Keep crisp intentional pixel clusters and readable silhouette at runtime size.

## JOB 14-01 — `hub.fg.railing_center`

Create exactly ONE standalone foreground railing segment: dark stone posts and blue-black painted metal lattice, 3/4 perspective, warm lamp reflections and cool dusk shadows. 192×96 logical sprite, bottom-center anchor. Designed to occlude NPC legs in the lower screen. No plants, lamps, ground or text.

## JOB 14-02 — `hub.fg.railing_corner`

Create exactly ONE corner/turn railing module matching 14-01 materials and height, with a clear 90-degree perspective turn suitable for screen edges. 128×96 logical sprite, transparent background. No plants or extra props.

## JOB 14-03 — `hub.fg.autumn_shrub_cluster`

Create exactly ONE dense autumn shrub cluster for foreground occlusion: dark green base foliage with controlled amber/rust leaves, broad coherent pixel masses, no tiny noisy leaf confetti. 128×96 logical sprite, bottom-center anchor, transparent RGBA.

## JOB 14-04 — `hub.fg.conifer_cluster`

Create exactly ONE compact North-West conifer cluster, 2–3 overlapping small pines as one gameplay asset group, cool blue-green mass with restrained warm reflected light. 144×128 logical sprite, bottom-center. Transparent background, no ground.

## JOB 14-05 — `hub.prop.lamp_post_warm`

Create exactly ONE campus lamp post: dark metal/stone base, classic restrained scientific-campus lantern, warm amber light source, no painted glow background. 48×96 logical sprite, bottom-center pivot. Transparent RGBA.

## JOB 14-06 — `hub.prop.direction_sign_blank`

Create exactly ONE blank campus direction sign structure: compact post with 2–3 dark blue sign plates, NO text or symbols, metal frame, small warm edge light. 64×80 logical sprite, bottom-center. Runtime adds text separately.

## JOB 14-07 — `hub.gameplay.discovery_plinth`

Create exactly ONE small interactive discovery plinth/pedestal for collectible world findings: low blue-gray stone/metal pedestal with a circular weather/science emblem socket, subtle cyan accent, readable silhouette. 64×64 logical sprite, bottom-center. No item displayed, no text.

## JOB 14-08 — `hub.gameplay.notice_board_blank`

Create exactly ONE campus notice board/kiosk with blank dark inset panel for runtime text, shallow roof/cap, warm side lamp, institutional scientific style. 80×96 logical sprite, bottom-center. NO writing, posters or icons baked in.

## JOB 14-09 — `hub.gameplay.instrument_station`

Create exactly ONE small outdoor meteorological instrument station group: Stevenson screen/radiation shield box, small thermometer housing and compact sensor mast on one shared base. Scientifically plausible, not decorative. 96×96 logical sprite, transparent RGBA, bottom-center.

## JOB 14-10 — `hub.gameplay.central_globe`

Create exactly ONE central interactive scientific globe sculpture for the plaza: blue/brass globe with broad continent shapes, mounted in a restrained armillary frame over a low stone plinth. 112×128 logical sprite, bottom-center, premium pixel art, warm/cool reflections. No water basin, people, ground or text.

## Acceptance

- foreground assets must visibly support occlusion and depth;
- all game objects have clear anchors and interaction silhouettes;
- no baked labels/text;
- alpha must be real transparency;
- no runtime CSS offsets should be needed for basic placement.
