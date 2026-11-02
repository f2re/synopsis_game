# BATCH-28 — Hub rare ambient events

Purpose: добавить редкие микро-события первого экрана, которые создают ощущение самостоятельной жизни мира, не влияя на геймплей и геометрию сцены.

## Global contract

Use accepted Hub scale/perspective and `hub.geometry.lock_v1` where full-scene alignment is required. One job = one image. No contact sheet, no text, no UI. Events must be optional overlays/sprites and removable without changing base scene. Avoid spectacle that competes with CTA or task labels.

## JOB 28-01 — `hub.event.large_bird_flock`
Create exactly ONE transparent distant-bird event group: 18–24 tiny birds in a loose curved migration/flock pattern, designed for far-sky layer. 160×64 logical group, center pivot, dark cool silhouettes with 2–3 tone variation. No sky fill.

## JOB 28-02 — `hub.event.balloon_high_altitude`
Create exactly ONE isolated distant aerological balloon already high above campus: tiny cream-white sphere with very small radiosonde/tether cue, 48×64, center pivot. No clouds or sky.

## JOB 28-03 — `hub.event.squirrel_with_nut`
Create exactly ONE 48×48 transparent squirrel event sprite: accepted squirrel identity carrying a small nut, paused alertly near vegetation. Bottom-center, no ground/tree.

## JOB 28-04 — `hub.event.pascal_window`
Create exactly ONE transparent small Pascal-cat event sprite designed to appear in an existing window: only cat head/front paws peeking over a sill-compatible baseline, preserve accepted orange-white identity and ear notch. 48×32, bottom-center. No window frame.

## JOB 28-05 — `hub.event.gull_takeoff`
Create exactly ONE transparent gull takeoff keyframe from accepted gull identity: wings raised, feet leaving perch, 48×48, same scale/palette. No perch/background.

## JOB 28-06 — `hub.event.paper_gust`
Create exactly ONE transparent ambient group of 3–5 loose blank paper sheets caught by a gust, broad pixel shapes, no readable writing, 96×64, center pivot. Designed for short path animation across plaza.

## JOB 28-07 — `hub.event.aircraft_rare`
Create exactly ONE distant unusual but plausible research/utility aircraft silhouette for far background, no logos, 96×48, center pivot. Distinct from normal passenger traffic but not military.

## JOB 28-08 — `hub.event.aurora_subtle`
Create exactly ONE full-scene 640×360 transparent subtle aurora overlay for rare cold clear-night conditions: restrained green-cyan pixel ribbons confined to upper sky, broad low-opacity clusters, no smooth gradients, no scene geometry. Must not dominate architecture.

## JOB 28-09 — `hub.event.festive_lights`
Create exactly ONE 640×360 transparent seasonal festive-light overlay aligned to accepted architecture: small warm string-light clusters along limited approved facade/railing edges, no text, no holiday symbols requiring cultural specificity, no geometry changes.

## JOB 28-10 — `hub.event.quiet_night_reduced_population`
Create exactly ONE QA/reference composite state of the accepted Hub at night with nearly empty campus: same geometry and lighting family, only minimal ambient figures and static props. This is a reference for scheduling population density, not a new background.

## Acceptance

- event assets remain secondary to navigation and CTA;
- no event changes building/terrain geometry;
- rare events can be disabled entirely;
- no event is required to understand gameplay;
- reduced-motion may substitute static pose or suppress the event;
- no text/fake data baked into any event.
