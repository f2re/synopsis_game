#!/usr/bin/env python3
"""Extract source-exact, position-preserving R08 candidate scene cutouts.

Run from any directory. The authored polygon spec is one directory above.
No source image is modified, resized, recolored, quantized, or repainted.
"""

from __future__ import annotations

import hashlib
import json
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, __version__ as pillow_version


HERE = Path(__file__).resolve().parent
SPEC_PATH = HERE.parent / "extraction-spec.json"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--diagnostics-dir", type=Path, default=None)
    args = parser.parse_args()
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    source_path = SPEC_PATH.parent / spec["source"]["path"]
    assert sha(source_path.read_bytes()) == spec["source"]["sha256"], "Source bytes changed"
    source = Image.open(source_path).convert("RGBA")
    assert source.size == (spec["source"]["width"], spec["source"]["height"])
    assert sha(source.tobytes()) == spec["source"]["rgbaSha256"], "Source RGBA changed"
    assert source.getchannel("A").getextrema() == (255, 255), "Expected opaque master"

    raw_masks: dict[str, Image.Image] = {}
    for item in spec["layers"]:
        mask = Image.new("L", source.size, 0)
        drawing = ImageDraw.Draw(mask)
        for polygon in item["polygons"]:
            for x, y in polygon:
                assert 0 <= x < source.width and 0 <= y < source.height
            drawing.polygon([tuple(point) for point in polygon], fill=255)
        raw_masks[item["id"]] = mask

    union = Image.new("L", source.size, 0)
    recomposed = Image.new("RGBA", source.size, (0, 0, 0, 0))
    reports = []
    owned_masks = {}
    for item in sorted(spec["layers"], key=lambda entry: entry["z"]):
        mask = raw_masks[item["id"]].copy()
        for other_id in item["subtractLayerMasks"]:
            mask = ImageChops.subtract(mask, raw_masks[other_id])
        owned_masks[item["id"]] = mask
        overlap = ImageChops.multiply(union, mask)
        assert overlap.getbbox() is None, "Owned masks must be disjoint"
        bounds = mask.getbbox()
        assert bounds, "Empty mask"
        full = Image.new("RGBA", source.size, (0, 0, 0, 0))
        full.paste(source, (0, 0), mask)
        crop = full.crop(bounds)
        path = HERE / item["file"]
        crop.save(path, format="PNG", compress_level=9)
        x, y, right, bottom = bounds
        restored = Image.new("RGBA", source.size, (0, 0, 0, 0))
        restored.paste(crop, (x, y))
        assert restored.tobytes() == full.tobytes(), "Crop origin drift"
        recomposed = Image.alpha_composite(recomposed, restored)
        union = ImageChops.lighter(union, mask)
        selected = sum(mask.histogram()[255:])
        anchor_x, anchor_y = item["anchorScenePx"]
        reports.append({
            "id": item["id"],
            "file": item["file"],
            "size": list(crop.size),
            "cropRectXYWH": [x, y, right - x, bottom - y],
            "originalSceneXY": [x, y],
            "anchorScenePx": item["anchorScenePx"],
            "pivotLocalPx": [anchor_x - x, anchor_y - y],
            "opaquePixels": selected,
            "sha256": sha(path.read_bytes()),
            "sha12": sha(path.read_bytes())[:12],
            "rgbaSha256": sha(crop.tobytes()),
            "alphaValues": [index for index, count in enumerate(crop.getchannel("A").histogram()) if count],
            "sourcePixelsExact": True,
            "reviewStatus": "candidate, independent review pending",
        })

    expected = Image.new("RGBA", source.size, (0, 0, 0, 0))
    expected.paste(source, (0, 0), union)
    assert recomposed.tobytes() == expected.tobytes(), "Recomposition differs inside masks"
    recomposed.save(HERE / "recomposed-inside-masks.png", compress_level=9)
    union.save(HERE / "union-mask.png", compress_level=9)

    # This inspection image is deliberately separate from unscaled source cutouts.
    preview = Image.new("RGBA", source.size, (38, 45, 52, 255))
    drawing = ImageDraw.Draw(preview)
    for y in range(0, source.height, 8):
        for x in range(0, source.width, 8):
            if (x // 8 + y // 8) % 2 == 0:
                drawing.rectangle((x, y, x + 7, y + 7), fill=(60, 69, 77, 255))
    preview = Image.alpha_composite(preview, recomposed)
    preview.crop((278, 134, 370, 223)).resize((736, 712), Image.Resampling.NEAREST).save(
        HERE / "inspection-preview-8x.png", compress_level=9
    )

    result = {
        "task": spec["task"],
        "source": spec["source"],
        "specSha256": sha(SPEC_PATH.read_bytes()),
        "extractorSha256": sha(Path(__file__).read_bytes()),
        "pillowVersion": pillow_version,
        "layers": reports,
        "unionOpaquePixels": union.histogram()[255],
        "exactRecomposition": {
            "passes": True,
            "maxChannelDifference": 0,
            "mismatchedPixels": 0,
            "scope": "union of selected masks only; no clean plate or invented pixels",
        },
        "status": "candidate-scene-cutouts-not-production-sprites",
        "previewOnly": "inspection-preview-8x.png is enlarged for inspection; never use it as art source",
    }
    if args.diagnostics_dir is not None:
        plate_path = SPEC_PATH.parent / "provider" / "archive-ground-01.png"
        plate = Image.open(plate_path).convert("RGBA")
        assert plate.size == source.size, "Clean plate cannot be resized for this proof"
        facade_mask = owned_masks["hub.r08.candidate.archive.facade-visible"]
        local_patch = source.copy()
        local_patch.paste(plate, (0, 0), facade_mask)
        outside = ImageChops.invert(facade_mask)
        untouched_before = Image.new("RGBA", source.size, (0, 0, 0, 0))
        untouched_after = untouched_before.copy()
        untouched_before.paste(source, (0, 0), outside)
        untouched_after.paste(local_patch, (0, 0), outside)
        assert untouched_before.tobytes() == untouched_after.tobytes(), "Outside mask changed"
        roundtrip = Image.alpha_composite(local_patch, recomposed)
        assert roundtrip.tobytes() == source.tobytes(), "Source roundtrip is not exact"
        args.diagnostics_dir.mkdir(parents=True, exist_ok=True)
        patch_path = args.diagnostics_dir / "r08-archive-ground-local-patch.png"
        roundtrip_path = args.diagnostics_dir / "r08-archive-source-roundtrip.png"
        local_patch.save(patch_path, compress_level=9)
        roundtrip.save(roundtrip_path, compress_level=9)
        result["localPlateRoundtrip"] = {
            "platePath": "provider/archive-ground-01.png",
            "plateSha256": sha(plate_path.read_bytes()),
            "patchMask": "hub.r08.candidate.archive.facade-visible after lamp exclusion",
            "outsideMaskChangedPixels": 0,
            "stepsLampAndNeighboringIvy": "original source pixels retained",
            "restoredMasterRgbaSha256": sha(roundtrip.tobytes()),
            "originalMasterRgbaSha256": sha(source.tobytes()),
            "exactRgbaEquality": True,
            "diagnosticLocalPatch": patch_path.name,
            "diagnosticRestoredMaster": roundtrip_path.name,
            "diagnosticDirectoryRole": "external inspection directory selected with --diagnostics-dir",
            "scope": "proof of reversible layer extraction only; no acceptance of invented clean-plate terrain",
        }
    (HERE / "extraction-report.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "layers": [{"file": entry["file"], "size": entry["size"], "sceneXY": entry["originalSceneXY"]} for entry in reports],
        "unionPixels": result["unionOpaquePixels"],
        "exactRecomposition": result["exactRecomposition"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
