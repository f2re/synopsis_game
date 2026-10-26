# Asset pipeline

Engineering home for reproducible conversion of editable art into browser-ready assets.

Pipeline: `assets/source` → sprite-tools validation/metadata → atlas preparation → AssetPack optimisation/compression → `assets/generated`.

The pipeline must preserve frame timing, tags, pivots/origins, palette identity and interactive bounds. Generated files are products, never authoring sources. A build must be repeatable from source + manifest + pinned toolchain.
