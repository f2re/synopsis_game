# HUB 2.5D independent review checklist

This checklist is for reviewers, not the implementation owner.

## Web Performance

- [ ] record frame time with `pixelPalette=1`, `pixelDither=1`, `pixelEdges=1`;
- [ ] compare with each pass disabled;
- [ ] test desktop, classroom/projector and mid-range mobile profiles;
- [ ] inspect resize/DPR behaviour;
- [ ] inspect reduced-motion and low-power behaviour;
- [ ] report draw calls / triangle count / GPU resource observations if available;
- [ ] verify no per-frame React state traffic was introduced.

## Integration & Release

- [ ] `pnpm bootstrap`;
- [ ] `pnpm typecheck`;
- [ ] `pnpm test:server`;
- [ ] `pnpm build`;
- [ ] repository validators;
- [ ] legacy `?hubRenderer=legacy2d` smoke test;
- [ ] Three path `?hubRenderer=three2d` smoke test;
- [ ] Linux release candidate checks remain green.

## Art Director

Capture the same canonical composition for:

- [ ] day;
- [ ] night;
- [ ] rain;
- [ ] snow;
- [ ] fog;
- [ ] palette off/on;
- [ ] dithering off/on;
- [ ] edges off/on.

Reject if the result reads primarily as generic low-poly geometry with a pixelation filter. Accept only if silhouette, palette, material grouping, lighting bands and motion cadence form a coherent intentional pixel language.

## Geometry Lock

- [ ] camera projection fixed;
- [ ] canonical logical canvas 640×360;
- [ ] building entrance anchors project to documented logical positions;
- [ ] picking returns semantic building ID;
- [ ] weather/season/day changes do not move geometry;
- [ ] renderer mesh UUIDs are absent from gameplay/world state.
