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

## R01 SpriteCook component export

The isolated `build_hub_r01.py` exporter builds the five R01 collections from their
committed, editable, single-frame `.aseprite` documents. It does not replace the
general sprite-tools / AssetPack pipeline and does not build an atlas.

```bash
python -m pip install -r tools/assets/requirements-r01.txt
python tools/assets/build_hub_r01.py
python tools/assets/build_hub_r01.py --check
```

The reviewed export was produced with Python 3.12.14, Pillow 13.0.0 and zlib 1.3.2.
`--check` compares every output byte and its manifest SHA-256 against the editable
source. Normal export writes `assets/generated` and `apps/web/public` only when
their bytes change. PNG compression is lossless. Visible RGB pixels and native
dimensions are retained; manifest alpha thresholds clean the final cutout edges.

`--import-source` is a one-time bootstrap from the preserved provider PNGs. It
never overwrites an existing editable document. Source edits such as removal of
the tree's detached edge artifact live in the `.aseprite` cel and are documented
in `sourceEdits`; deleting that document and reimporting the raw PNG would lose
those edits. The reader supports ordinary full-opacity RGBA image layers with
raw or zlib-compressed cels. It rejects groups, animation, linked cels and blend
modes instead of flattening unsupported features silently.

The manifests retain SpriteCook IDs, source crops, pivots, component states,
nine-slice edges and checksums. `spritecook-assets.json` is the local provider
registry; it contains no signed download URLs or credentials. The UI's progress
samples are style references, not factual progress indicators. The 28 UI parts,
six facades, six props, coastal sky and ground plate are independently reviewed
as native raster components in the pixel style of R01, not a full-screen copy of
the reference or a strict shared 480-pixel sprite grid.
