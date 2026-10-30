# BATCH-05 — Hub layers, landmarks and ambient life

**Prerequisite:** accepted `scene_hub_geometry_master_dusk.png` (00-10) must be attached as composition/light reference to every job.  
Do not redraw the whole Hub for isolated sprites. Jobs 05-01 and 05-02 return a full 480×270 transparent canvas aligned to the master; other jobs return one isolated object/character.

## JOB 05-01 — `hub.foreground.railing`
> Create exactly ONE transparent full-scene foreground occluder layer for the attached accepted Hub master. Preserve the exact 480×270 scene geometry and camera. Output ONLY the nearest foreground stone/metal railing segments that naturally cross in front of moving characters near the bottom edge; every other pixel must be transparent. Match the master’s dusk light, material language and perspective. Dark blue-gray stone and painted metal with small warm reflected lamp accents; coherent pixel clusters, no new buildings or plants unless physically attached to the railing. Do not trim canvas. No UI, text, labels, people, card, alternate version or sprite sheet.

## JOB 05-02 — `hub.foreground.conifer_canopy`
> Create exactly ONE transparent full-scene foreground vegetation occluder aligned precisely to the attached Hub master. Output ONLY the nearest conifer/branch canopy pixels that should pass in front of world characters at the side/bottom scene edges; all remaining 480×270 pixels are transparent. Keep exact camera, horizon and lighting. North-West conifer foliage in broad blue-green clusters with limited warm lamp reflection; no random needle noise. Do not move or redraw architecture. Do not trim canvas. One layer only, no UI/text/people/extra scene panels.

## JOB 05-03 — `hub.prop.weather_balloon`
> Create exactly ONE standalone transparent Hub prop: a tethered meteorological/aerology balloon prepared for launch, consistent with the attached Hub perspective. One object group only: cream-white rounded balloon, short tether and small instrument package; no staff, no building, no sky. 64×96 logical pixel-art sprite with clear silhouette, subtle panel clusters, cool violet-blue dusk shadows and warm station-light edge. Bottom-center attachment/anchor at the end of tether/package. Genuine alpha, no text, card, second balloon, variants or sheet.

## JOB 05-04 — `hub.prop.windsock`
> Create exactly ONE standalone transparent windsock sprite for the Hub, consistent with the master camera and dusk light. Slim dark pole with a red-and-white striped fabric sock blowing clearly to one side; cloth shape readable in a 64×64 logical grid. Strong silhouette and few large folds, no tiny stripe noise; cool navy shadow and warm lamp rim. Bottom-center anchor at pole base. No ground patch, building, sky, text, second windsock or sprite sheet.

## JOB 05-05 — `hub.prop.radar_dish`
> Create exactly ONE standalone transparent meteorological radar/antenna dish sprite that could be animated by rotation in the Hub. One object only, 3/4 view matching attached master. Compact pale metal parabolic dish, dark support yoke/base and a small feed horn; credible scientific instrument, not satellite-TV toy or sci-fi weapon. 96×96 logical pixel art with clean stepped ellipse, grouped metal highlights, cool shadow, tiny warm reflections. Pivot must be obvious at the rotation/yoke center; bottom-center base anchor. No roof/background, text, second dish or sheet.

## JOB 05-06 — `hub.npc.student_a`
> Create exactly ONE standalone transparent 32×48 world-character sprite: meteorology student A, idle, facing 3/4/front compatible with the Hub camera. One person only. Distinct silhouette from player: short dark hair, light field shirt under blue vest/jacket, small notebook at side, relaxed conversational posture. Deliberate low-resolution clusters, 24–48 purposeful colors, no facial micro-noise, selective local outline, dusk cool shadow plus warm window/lamp edge. Feet on one baseline; bottom-center anchor. No floor, speech bubble, text, second person or sprite sheet.

## JOB 05-07 — `hub.npc.student_b`
> Create exactly ONE standalone transparent 32×48 world-character sprite: meteorology student B, idle, one person only. Distinct silhouette: tied-back/cropped light-brown hair, warm muted sweater or jacket over dark trousers, clipboard tucked under one arm, attentive friendly stance. Same camera scale and lighting family as accepted Hub; intentional clusters, no template-body recolor feel, clean baseline and bottom-center anchor. No background, shadow plate, text, other NPC, alternate pose or sheet.

## JOB 05-08 — `hub.npc.observer`
> Create exactly ONE standalone transparent 32×48 world-character sprite: experienced field observer, one person only. Slightly older silhouette, practical cap, dark weatherproof jacket, instrument pouch/compact field case, upright professional posture. Match Hub character scale and dusk light. Use readable garment masses and one or two brass/amber details, no military appearance, no pixel noise. Feet share baseline, bottom-center anchor. No environment, text, second person, variants or sprite sheet.

## JOB 05-09 — `hub.landmark.globe_fountain`
> Create exactly ONE standalone transparent interactive landmark: the central scientific globe fountain/sculpture visible in the Hub plaza. One object group only. Low circular stone basin with a stylized translucent/metal world globe held above it, subtle water jets contained within silhouette; globe geography may be abstract broad continent shapes, no labels. Perspective must match attached master; 96×112 logical pixel art with readable stone/glass/water materials, cool cyan water and warm plaza reflections. Bottom-center anchor. No plaza floor, people, UI, text, second sculpture or sheet.

## JOB 05-10 — `hub.prop.park_bench`
> Create exactly ONE standalone transparent campus park bench, one object only, 3/4 view matching Hub perspective. Dark weathered wood slats with sturdy blue-gray metal frame, compact practical campus furniture, subtle warm lamp reflections and cool dusk shadows. 96×48 logical pixel art, clean silhouette, grouped wood/metal clusters. Bottom-center ground anchor. No ground patch, plant, person, cat, text, second bench or sprite sheet.

## Integration rule

Buildings remain in the geometry master unless an animation/state requires separation. Interaction hit areas are scene geometry, not AI-generated art. Day/night variants must preserve this master geometry and should be generated as masks/edits rather than independent re-imaginations.