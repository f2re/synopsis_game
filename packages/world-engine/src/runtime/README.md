# runtime

Phaser bootstrap/configuration, renderer policy, logical pixel scaling, texture sampling, pause/resume and WebGL context handling. Owned by `game-runtime-webgl-engineer`.

## R08 candidate preview

The explicit `/art/r08` route creates its own disposable `R08PreviewScene` with
`createR08PreviewGame`. `/?stationArt=r08` runs the same authored layers inside
the normal station shell for acceptance. That mode maps the six doorways to
existing station actions, uses 2× source coordinates (1024×576 logical), and
pans the composition inside a horizontal `PixelScrollArea` in portrait. Its
backing store is capped at 589,824 pixels to bound fill cost in the wide panorama.
The responsive projection may still use fractional display zoom. The default Hub
continues to use the accepted station scene.
The pipeline owns `/hub/r08-preview/manifest.json`; runtime validates the candidate
status, local URLs, source bounds, unique semantic roles, light regions and a
2,097,152-pixel texture budget before loading. The current pack uses the original
512×288 composition and exact scene cutouts, all at one source-to-world transform
of 1.875 into 960×540. This fractional grid is explicitly **not production approved**.
The existing observer retains its authored 48-world-pixel height and frame cadence.

React owns native controls and an accessible archive target. Phaser owns the
camera, source-exact layer positions, NPC route and depth. The target is projected
through the same camera and has a minimum 44 CSS-pixel hit area. The route enters
the existing reading room at `/archive?returnTo=/art/r08`; ordinary `/archive`
visits retain their existing return destination.

Day preserves the source artwork. The twilight candidate uses a shared ambient
falloff sampled in original scene coordinates plus eight local masked light regions;
it never swaps in the generative dusk study. Separate authored shadow planes,
final palette/lighting and technical pixel-art acceptance remain pending. The
foreground cutout renders after the observer and light receivers by its authored
depth line. There are no extra particles, tweens or audio contexts in this pilot.
Twilight is available only when the active renderer is WebGL: Phaser's Canvas
renderer does not apply image tint. Canvas keeps the daytime scene and hides all
light overlays; the UI disables Twilight and explains this capability limit.

Reduced motion freezes NPC travel and uses its idle frame. The user's effective
global preference cannot be overridden by the preview. Low power caps the loop at
30fps; the normal cap is 60fps. Hidden/context-lost canvases sleep; disposal removes
observers/listeners and destroys the game, including a previously sleeping loop.
Backbuffer sizing reuses the existing DPR and two-million-pixel viewport policy.
These are configured budgets, not measured device performance.

Validation: web TypeScript and production Vite build; bounded manifest, camera/DPR,
NPC route/depth and route-return unit checks. Actual browser rendering, pointer and
keyboard roundtrip, context restoration, remount cleanup and device frame/memory
measurements are **BLOCKED in the 2026-11-21 workspace**: local Chromium could not
create its process socket (`Operation not permitted`), and the available cloud
browser could not reach the local Vite server. No browser screenshot or visual PASS
is claimed. Required independent reviewers remain Art Director, pixel-art quality,
UX/accessibility, web performance and integration/release.
