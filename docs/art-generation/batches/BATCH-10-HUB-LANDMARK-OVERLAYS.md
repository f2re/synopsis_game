# BATCH-10 — Hub landmark identity overlays

Purpose: сделать каждую функциональную зону текущего Hub визуально узнаваемой **без текстовой подписи**, не перерисовывая всю сцену. Каждый job — transparent overlay/edit, выровненный относительно принятого `scene.hub.geometry_master.dusk`.

## Execution contract

- attach geometry master to every job;
- preserve exact camera/horizon/building geometry;
- do not replace whole building;
- output only the requested identity detail(s), everything else transparent;
- full canvas 480×270 for alignment-critical overlays; do not trim;
- no baked Russian text; labels remain live UI;
- one job = one PNG; no grid/contact sheet.

## JOB 10-01 — `hub.landmark.radar.identity_overlay`

Transparent 480×270 overlay aligned to Hub master. Add only visual identity of Radar zone: compact pale radome/dish assembly, small technical platform/rail detail and one subtle cold-blue instrument light. Preserve existing roof/building silhouette. No text, no people, no replacement sky. Exact coordinates relative to master.

## JOB 10-02 — `hub.landmark.maps_analysis.identity_overlay`

Transparent aligned overlay for Maps & Analysis: visible interior/window-wall motif with large map-light surface, a few broad chart/map color blocks and desk silhouettes, but no readable map data or text. Keep building geometry unchanged. Warm interior light, cool exterior frame.

## JOB 10-03 — `hub.landmark.archive.identity_overlay`

Transparent aligned overlay for Archive: distinctive warm archive window/door opening, shelves/document-box silhouettes and one brass desk-lamp accent visible through glass. No readable labels, no new building mass.

## JOB 10-04 — `hub.landmark.aerology.identity_overlay`

Transparent aligned overlay for Aerology: roof/deck launch cues — balloon preparation rack, compact reel/tether hardware and one pale balloon envelope or launch cradle detail. Do not duplicate full balloon sprite if BATCH-05/08 provides it; overlay should define the facility.

## JOB 10-05 — `hub.landmark.tournament.identity_overlay`

Transparent aligned overlay for Tournament Hall: restrained vertical fabric banners, trophy-shaped light motif and brighter event-entry lighting. Competitive/scientific, not sports-arena kitsch. No text, no logos, no crowd baked into overlay.

## JOB 10-06 — `hub.landmark.codepost.identity_overlay`

Transparent aligned overlay for Code Post: compact antenna/mast cluster, instrument cabinet glow and one distinctive amber/green status-light pattern. No text or fake terminal data. Existing building remains untouched.

## JOB 10-07 — `hub.landmark.main_center.identity_overlay`

Transparent aligned overlay for central Synoptic Center entrance: scientific emblem geometry (cloud/wind/globe motif without text), warm entrance canopy light and subtle brass/blue identity details. Keep facade geometry exact.

## JOB 10-08 — `hub.landmark.greenhouse.identity_overlay`

Transparent aligned overlay for greenhouse/observation glass structure: internal warm work lamps, plant/measurement silhouettes and one small instrument stand visible through panes. No people and no fake charts.

## JOB 10-09 — `hub.landmark.rooftop_instruments.overlay`

Transparent aligned overlay containing only rooftop meteorological instrument details across the campus: small antennas, mast tips, compact wind sensor silhouettes and cable/support details. Avoid clutter; keep large empty transparent regions. No new roofs.

## JOB 10-10 — `hub.landmark.entry_wayfinding_icons.overlay`

Transparent aligned overlay with small physical pictographic plaques/signs at entrances: radar-wave icon, map-layer icon, archive-box icon, balloon icon, trophy icon, code/telegraph icon. Symbols only, no text. Must look like in-world signage, not React UI badges.

## Acceptance

- overlay must align 1:1 to geometry master;
- no architecture drift;
- no baked labels;
- each facility should be distinguishable at normal Hub zoom even with labels hidden;
- removing the overlay must reveal unchanged base geometry;
- landmark details must not compete with main CTA/UI.
