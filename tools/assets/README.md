# Asset pipeline

Engineering home for reproducible conversion of editable art into browser-ready assets.

```text
tools/assets/
├── config/       # versioned sprite-tools / AssetPack configuration
└── scripts/      # deterministic validation/generation wrappers
```

Canonical flow:

`assets/source` → manifest validation → sprite-tools validation/metadata/transforms → Tiled scene references → AssetPack packing/optimisation → `assets/generated`.

The pipeline must preserve frame timing, animation tags, pivots/origins, palette identity, stable semantic asset IDs and interactive bounds. Generated files are products, never authoring sources. A production build must be repeatable from source + manifest + pinned toolchain.

At the architecture/scaffold stage only `pnpm assets:toolchain:check` is exposed. Real conversion commands/configuration are delivered by `ASSET-002` and `ASSET-003`; we intentionally do not publish a fake `assets:build` command that cannot yet reproduce a production atlas.
