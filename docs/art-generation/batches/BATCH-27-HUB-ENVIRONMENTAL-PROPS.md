# BATCH-27 — Hub environmental props

Purpose: наполнить главный экран правдоподобными мелкими объектами научного кампуса без запекания их в geometry master.

## Global contract

Each job returns exactly ONE isolated transparent RGBA asset, no contact sheet, no text, no UI, no floor/background unless explicitly part of the object. Match accepted Hub 3/4 perspective, scale family, dusk palette and pixel-cluster language. Bottom-center pivot unless otherwise specified.

## JOB 27-01 — `hub.prop.bike_rack`
Create exactly ONE compact campus bicycle rack with 2–3 simple bicycles as one asset group, dark metal, practical scientific-campus style, subtle warm reflections. 128×64 logical sprite, bottom-center. No people, no ground patch.

## JOB 27-02 — `hub.prop.utility_box`
Create exactly ONE outdoor technical utility/electrical cabinet: blue-gray metal box with small ventilation slots and one amber service indicator, no readable warning text. 48×64, bottom-center.

## JOB 27-03 — `hub.prop.map_kiosk_blank`
Create exactly ONE freestanding campus map/information kiosk with a blank dark inset display panel for runtime content. No baked map or text. 80×112, bottom-center.

## JOB 27-04 — `hub.prop.planter_large`
Create exactly ONE large institutional stone/metal planter with compact North-West seasonal vegetation, broad pixel clusters, no noisy leaf confetti. 80×64, bottom-center.

## JOB 27-05 — `hub.prop.trash_bin`
Create exactly ONE restrained campus waste bin/recycling unit, dark blue-gray metal, subtle weather emblem shape without text. 40×56, bottom-center.

## JOB 27-06 — `hub.prop.delivery_cart`
Create exactly ONE small hand trolley/cart for documents/instruments, practical metal frame with one closed equipment case, no labels. 72×56, bottom-center.

## JOB 27-07 — `hub.prop.outdoor_table`
Create exactly ONE compact outdoor scientific-work table/bench: weather-resistant wood/metal, one closed notebook and empty mug silhouette as integral props, no text. 96×64, bottom-center.

## JOB 27-08 — `hub.prop.service_ladder`
Create exactly ONE short fixed maintenance ladder/stair segment for rooftop/service access, dark metal, clean 3/4 perspective. 48×96, bottom-center.

## JOB 27-09 — `hub.prop.sensor_cabinet`
Create exactly ONE outdoor sensor/logger cabinet with radiation shield and cable conduit, scientifically plausible, no readable screen. 64×80, bottom-center.

## JOB 27-10 — `hub.prop.notice_post_blank`
Create exactly ONE small standing campus notice post with one blank rectangular plate and subtle warm edge lamp. No posters, no text, no icons. 64×80, bottom-center.

## Acceptance

- one asset only per file;
- true alpha;
- readable at intended scale;
- no labels or fake data;
- no perspective drift relative to Hub;
- props must be optional and removable without breaking scene geometry.
