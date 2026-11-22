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

## R08 isolated scene preview

`build_hub_r08.py` reads `assets/manifests/hub.r08-preview.json` and exports only
`assets/generated/hub/r08-preview` and `apps/web/public/hub/r08-preview`. It does
not change the R01 export or provider registry. The runtime contract is available
at `/hub/r08-preview/manifest.json` for the isolated `/art/r08` review route.

```bash
python tools/assets/build_hub_r08.py
python tools/assets/build_hub_r08.py --check
```

All scene slices share the canonical 512×288 source coordinates. Their common
preview transform is 1.875 to 960×540 with nearest sampling; this noninteger
preview scale is explicitly not a production-grid approval. Existing NPCs remain
48 world pixels high, with their path anchors transformed from source coordinates.
Never fit individual buildings to separate boxes.

The archive ground is rebuilt from the master and donor through the owned facade
alpha only. Source hashes, binary alpha, original coordinates, source-exact RGB,
mask separation and the complete source roundtrip are checked before any output
is written. `--check` compares every generated and public byte without writing.
The pipeline manifest is authored input and is never silently updated by export.

`assets/source/environment/hub/r08/pilot/mask-spec.json` is the editable polygon
source for the foreground scene slice and local light receiver masks. Reproduce
these source PNGs explicitly after an authoring change:

```bash
python tools/assets/build_hub_r08.py --prepare-pilot-sources
```

Then review the resulting source pixels, update the pinned hashes in the pipeline
manifest, and rebuild. Normal export also reproduces the polygons in memory and
rejects mismatching source PNGs. The masks retain the original scene geometry;
day/dusk color studies do not replace the baseline image. `lightRegions` gives
local source bounds and suggested tint/opacity independently for the entrance,
windows, Archive, laboratories, hall, lamp and nearby stone. These binary domains
are not physical illumination passes. Missing vegetation/contact/shadow layers
remain explicitly unavailable, and technical export success does not approve art.
