# BATCH-25 — Hub interaction visual states

Purpose: дать интерактивным зонам главного Hub визуальную обратную связь без запекания текста, labels или level data в графику.

## Global contract

Use `hub.geometry.lock_v1` and accepted architecture layers. All building-state jobs are full 640×360 transparent RGBA overlays at origin `(0,0)`, never trimmed. Do not move architecture. Generate only subtle pixel-art highlight/accent pixels needed for the state. Runtime text, labels, level numbers and hit areas remain separate UI/geometry. One job = one PNG.

## JOB 25-01 — `hub.interaction.radar.hover`
Create exactly ONE transparent hover overlay for the Radar building: restrained cool-cyan edge accents on existing radome/entrance contours plus a subtle warm doorway emphasis. No halo cloud, no text, no label plate. Preserve exact building geometry.

## JOB 25-02 — `hub.interaction.maps.hover`
Create exactly ONE transparent hover overlay for Maps & Analysis: subtle cyan glass-frame highlights and one restrained warm interior emphasis. No fake map graphics, no text.

## JOB 25-03 — `hub.interaction.archive.hover`
Create exactly ONE transparent hover overlay for Archive: restrained amber window/entrance emphasis and faint cool contour highlights on existing facade edges. No new geometry.

## JOB 25-04 — `hub.interaction.aerology.hover`
Create exactly ONE transparent hover overlay for Aerology: subtle cyan scientific-equipment accents and gentle warm preparation-bay emphasis. No balloon launch or geometry changes.

## JOB 25-05 — `hub.interaction.tournament.hover`
Create exactly ONE transparent hover overlay for Tournament Hall: restrained gold/amber ceremonial edge accents around accepted entrance/emblem mounting area. No trophy text, banners or UI.

## JOB 25-06 — `hub.interaction.codepost.hover`
Create exactly ONE transparent hover overlay for Code Post: compact cyan operational accents around communications/entrance details plus subtle warm control-room emphasis. No text.

## JOB 25-07 — `hub.interaction.maincenter.hover`
Create exactly ONE transparent hover overlay for the main Synoptic Center: very restrained cyan/amber emphasis on entrance stairs, central doorway and accepted weather-insignia area. Must remain visually dominant but not flashy.

## JOB 25-08 — `hub.interaction.selected.ringless`
Create exactly ONE generic selected-state overlay system applied to the currently selected building area in Image A: stronger but still pixel-art-consistent edge accents, no circular ring, no neon outline around entire silhouette, no text. Preserve the building itself unchanged.

## JOB 25-09 — `hub.interaction.locked.dim_mask`
Create exactly ONE transparent locked-state dimming overlay mask for a selected building region: cool desaturated blue-gray translucent pixel clusters that reduce local contrast without obscuring silhouette. Do not paint padlock icons or text; runtime UI supplies status.

## JOB 25-10 — `hub.interaction.upgrade.available`
Create exactly ONE transparent upgrade-available accent overlay for an eligible building: 2–4 tiny controlled green/cyan architectural accent pixels near an existing entrance/fixture area, designed to pair with a runtime upgrade icon. No arrow, no plus sign, no text, no badge.

## Acceptance

- hover state must disappear cleanly to reveal unchanged base;
- overlays contain no copied full facade pixels except necessary edge accents;
- no text/labels/level numbers/icons;
- no bloom that crosses into neighboring hotspot region;
- hover/selected states remain legible under day/night/weather combinations;
- reduced-motion changes no geometry and uses static state only.
