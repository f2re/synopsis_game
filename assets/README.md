# Game assets

Canonical asset layout:

```text
assets/
├── source/       # editable .aseprite sources and authored raster/vector components
├── scenes/       # Tiled JSON scenes/world data (.tmj/.tsj)
├── manifests/    # animation tags, pivots, licenses, provenance, semantic IDs
└── generated/    # atlases, runtime PNG/WebP, JSON metadata; never hand-edited
```

`design/pixel-art/` remains the visual-reference area. It is not the runtime asset source.

Source families under `source/`: `characters/`, `animals/`, `environment/`, `props/`, `tilesets/`, `effects/`, `ui/`, `palettes/`.

Naming uses stable semantic IDs. Time-of-day lighting should normally be masks/palette/tint data rather than duplicated full scenes.

See `docs/design/PIXEL_ASSET_PIPELINE.md`.
