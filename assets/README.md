# Game assets

Canonical asset layout:

```text
assets/
├── source/                         # editable production sources
│   ├── characters/                 # avatar/NPC modular layers
│   ├── animals/                    # birds, squirrel, companions, fauna
│   ├── environment/                # architecture, vegetation, sky/world pieces
│   ├── props/                      # tools, furniture, radar, lamps, interactables
│   ├── tilesets/                   # reusable world/room tiles
│   ├── effects/                    # feedback and short-lived visual FX
│   ├── ui/                         # pixel-treated UI/icon assets only
│   └── palettes/                   # authored palette resources
├── scenes/                         # Tiled JSON scene sources
│   ├── hub/
│   ├── rooms/
│   └── shared/
├── manifests/                      # semantic IDs, animation/pivot/provenance data
│   └── asset-manifest.schema.json
└── generated/                      # build output; never hand-edited
    ├── atlases/
    ├── textures/
    └── metadata/
```

`design/pixel-art/` remains the visual-reference area. It is not the runtime asset source.

Preferred canonical sprite source is `.aseprite`; Pixelorama can be used as the supported open-source alternative under the contract in `config/art-toolchain.yaml`. Scene authoring is canonical in Tiled JSON (`.tmj/.tsj`).

Naming uses stable semantic IDs. Time-of-day lighting should normally be masks/palette/tint data rather than duplicated full scenes.

See `docs/design/PIXEL_ASSET_PIPELINE.md`.
