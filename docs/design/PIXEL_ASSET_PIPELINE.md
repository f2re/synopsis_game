# Конвейер пиксельной графики и анимации

**Статус:** принято

## Authoring contract

Primary editor: Aseprite. Open-source alternative: Pixelorama. Canonical editable sprite format is `.aseprite`. Canonical scene editor is Tiled using JSON `.tmj/.tsj`; LDtk is experimental only.

Every production asset must have a manifest entry containing: stable ID, source path, logical pixel dimensions, pivot/origin, animation states and frame durations, palette role, intended world layer, interaction/collision bounds where applicable, license/provenance, and expected generated outputs.

## Pipeline

1. Art Director issues a visual brief and scale/palette constraints.
2. Pixel Asset Designer creates/revises editable source art.
3. Pixel Asset Pipeline Engineer runs sprite-tools lint and derives validated tags/pivots/bounds/metadata.
4. Tiled scenes reference semantic asset IDs and layer/object properties.
5. AssetPack produces browser-ready optimised textures/atlases and manifests.
6. Game Runtime/WebGL Engineer consumes generated assets through Phaser.
7. Art Director accepts visual fidelity; Web Performance Engineer accepts runtime budgets; Integration & Release checks reproducibility.

## Animation policy

Do not equate smooth motion with 60 painted frames per second. Sprite frame cadence is authored for the pixel-art style (often roughly 4–15 fps depending on action), while position, camera, tween and parallax interpolation can update at display cadence. Never interpolate pixels into blurred intermediate frames.

## Validation

Reject: missing provenance; hand-edited generated files; inconsistent pivots; non-deterministic build output; atlas bleeding; smoothing artifacts; duplicated full-scene day/night images where masks/tints suffice; oversized sheets without a packing plan; missing reduced-motion behaviour.
