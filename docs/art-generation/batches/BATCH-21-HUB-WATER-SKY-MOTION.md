# BATCH-21 — Hub water and sky motion layers

Purpose: дать первому экрану спокойное движение воздуха и воды без перерисовки сцены.

## Global contract

Use `hub.geometry.lock_v1` as Image A. Exact 640×360 full-scene transparent overlays, origin `(0,0)`, never trim. One job = one PNG. No contact sheets, no UI, no text, no geometry changes, no new buildings. Preserve horizon and river band exactly.

## JOB 21-01 — `hub.sky.cloud_far.phase_a`
Create exactly ONE transparent far-cloud phase A: thin elongated cloud banks confined to the far-sky band, broad pixel clusters, low contrast, same placements as accepted cloud master. Transparent elsewhere.

## JOB 21-02 — `hub.sky.cloud_far.phase_b`
Create exactly ONE far-cloud phase B derived from 21-01: same cloud masses shifted horizontally by only 2–4 logical pixels with no shape redesign. Transparent elsewhere.

## JOB 21-03 — `hub.sky.cloud_mid.phase_a`
Create exactly ONE transparent mid-cloud phase A with 3–5 larger cloud masses, same accepted geometry and empty architecture-safe areas. No sky fill.

## JOB 21-04 — `hub.sky.cloud_mid.phase_b`
Create exactly ONE mid-cloud phase B: same masses displaced only 3–6 logical pixels horizontally, minor edge evolution only, no new clouds.

## JOB 21-05 — `hub.water.ripple.phase_a`
Create exactly ONE transparent river ripple highlight layer phase A. Short horizontal pixel clusters, perspective-compressed toward horizon, cool cyan/blue-white restrained highlights only. No solid water fill.

## JOB 21-06 — `hub.water.ripple.phase_b`
Create exactly ONE ripple phase B using the same river mask, shifting highlight clusters subtly by 1–3 pixels. No new water geometry.

## JOB 21-07 — `hub.water.reflection.phase_a`
Create exactly ONE transparent reflection state A: broken vertical amber/cyan reflection columns corresponding to accepted city/lamp positions. No solid water base.

## JOB 21-08 — `hub.water.reflection.phase_b`
Create exactly ONE reflection state B: same reflection sources, only breakup/fragment positions change slightly. Preserve source alignment.

## JOB 21-09 — `hub.atmosphere.haze.phase_a`
Create exactly ONE transparent distant haze state A between city, river and campus. Broad low-opacity pixel dither bands, no blur, no geometry.

## JOB 21-10 — `hub.atmosphere.haze.phase_b`
Create exactly ONE haze state B with only subtle density redistribution; same depth zones and same camera.

## Acceptance

- no visible jump when alternating A/B;
- no architecture pixel may appear in these layers;
- no cloud crosses critical hotspot label safe-zones excessively;
- water motion remains subordinate to gameplay;
- reduced-motion freezes phase A.
