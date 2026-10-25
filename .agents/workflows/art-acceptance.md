# Workflow — Art / Living World Acceptance

1. Load fixed references from `design/pixel-art/` and the two design specifications.
2. `art-director` defines/validates composition, palette tokens, sprite scale, world-location/solar phase mapping and scene density.
3. `pixel-asset-designer` or feature engineer produces reusable layered assets/components.
4. `web-performance-engineer` checks the implementation budget and graceful degradation.
5. `ux-accessibility-reviewer` checks task hierarchy, responsive/projector behavior and reduced-motion.
6. Record `ART_ACCEPTED` only if all blocking findings are resolved.

A static concept image can be a reference but is not sufficient implementation evidence. Production work must decompose into reusable sprites/layers/components.