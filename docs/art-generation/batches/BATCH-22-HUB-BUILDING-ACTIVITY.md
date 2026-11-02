# BATCH-22 — Hub building activity overlays

Purpose: добавить ощущение работающего центра через окна, двери и локальные внутренние сценки, не меняя фасады.

## Global contract

Use `hub.geometry.lock_v1` plus accepted architecture layers as references. Every job is a 640×360 transparent RGBA overlay with origin `(0,0)`, never trimmed. Only the requested interior/window/doorway pixels may differ. Architecture silhouette, roofline, stairs, doors, camera and scale are immutable. No text, no UI, no people outside buildings unless explicitly requested.

## JOB 22-01 — `hub.activity.maps_room.worklight`
Create exactly ONE transparent activity overlay for the Maps & Analysis pavilion: several warm interior desk/work-wall light patches and indistinct equipment silhouettes visible through existing glass. No readable map text or fake meteorological labels. Do not repaint glass frames or facade.

## JOB 22-02 — `hub.activity.maps_room.staff_silhouettes`
Create exactly ONE transparent interior-only overlay with 2–3 tiny staff silhouettes behind the accepted Maps & Analysis windows. People remain behind glass and do not alter exterior geometry.

## JOB 22-03 — `hub.activity.archive.window_reading`
Create exactly ONE transparent Archive activity overlay: one or two warm lit reading windows, subtle shelves/document silhouettes and a tiny seated archivist silhouette behind glass. No facade repaint.

## JOB 22-04 — `hub.activity.archive.door_open`
Create exactly ONE transparent doorway state for the Archive: accepted door opened slightly, narrow warm interior wedge and minimal interior depth. Preserve doorway frame exactly; no new architecture.

## JOB 22-05 — `hub.activity.aerology.prep_bay`
Create exactly ONE transparent Aerology interior activity overlay: warm preparation-bay light, balloon equipment/cart silhouettes and one tiny operator silhouette behind glass. No full balloon launch here.

## JOB 22-06 — `hub.activity.code_post.controlroom`
Create exactly ONE transparent Code Post control-room activity overlay: sparse warm monitor glow blocks and 1–2 tiny staff silhouettes through accepted windows. No readable screens, no text.

## JOB 22-07 — `hub.activity.tournament.rehearsal`
Create exactly ONE transparent Tournament Hall interior activity overlay: restrained stage/room lighting and a few tiny distant silhouettes behind windows/entrance, suggesting preparation but no event UI or banners.

## JOB 22-08 — `hub.activity.main_center.lobby`
Create exactly ONE transparent central Synoptic Center lobby activity overlay: warm entrance/lobby depth, 2–4 tiny silhouettes, subtle movement-ready grouping. Do not alter stairs, columns or facade.

## JOB 22-09 — `hub.activity.greenhouse.lablight`
Create exactly ONE transparent greenhouse/environment-lab activity overlay: warm bench lights, faint plant silhouettes and one tiny researcher silhouette through existing glass. Preserve frame geometry.

## JOB 22-10 — `hub.activity.windows.random_alt`
Create exactly ONE alternate full-campus window activity mask: same accepted window positions, but a different deterministic subset of windows lit/dim. No walls, roofs or new windows. Intended for slow seeded ambient switching.

## Acceptance

- facade pixels outside windows/door openings remain transparent;
- no new windows/doors may appear;
- no readable fake data;
- tiny figures must remain subordinate and inside architecture;
- switching overlays must never change building silhouette;
- reduced-motion can freeze one state.
