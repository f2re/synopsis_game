#!/usr/bin/env python3
"""Independent read-only source checks; writes review measurements only.

Do not import the asset exporter: this measures the actual exported PNGs from
their manifest positions. Passing numbers are not automatic art acceptance.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    spec_path = ROOT / "assets/source/environment/hub/r09/source-spec.json"
    manifest_path = ROOT / "assets/generated/hub/r09/manifest.json"
    spec = json.loads(spec_path.read_text())
    manifest = json.loads(manifest_path.read_text())
    master_path = ROOT / spec["sources"]["master"]["source"]
    master = Image.open(master_path).convert("RGBA")
    master_pixels = np.array(master)
    static = Image.new("RGBA", master.size)
    static_owners = np.zeros(master_pixels.shape[:2], dtype=np.uint8)
    moving = []
    entries = []
    for entry in manifest["assets"]:
        filename = Path(entry["url"]).name
        path = ROOT / "assets/generated/hub/r09" / filename
        public_path = ROOT / "apps/web/public/hub/r09" / filename
        original_mode = Image.open(path).mode
        image = Image.open(path).convert("RGBA")
        pixels = np.array(image)
        full = Image.new("RGBA", master.size)
        full.paste(image, tuple(entry["originalSceneXY"]))
        full_pixels = np.array(full)
        mask = full_pixels[:, :, 3] > 0
        item = {
            "id": entry["id"],
            "file": str(path.relative_to(ROOT)),
            "sha256": sha(path),
            "dimensions": list(image.size),
            "originalMode": original_mode,
            "alphaValues": np.unique(pixels[:, :, 3]).tolist(),
            "opaquePixels": int(mask.sum()),
            "transparentRgbNonzeroPixels": int(np.count_nonzero(
                np.any(pixels[:, :, :3] != 0, axis=2) & (pixels[:, :, 3] == 0)
            )),
            "shaMatchesManifest": sha(path) == entry["sha256"],
            "publicCopyByteIdentical": path.read_bytes() == public_path.read_bytes(),
            "manifestDimensionsMatch": list(image.size) == [entry["width"], entry["height"]],
        }
        if entry["role"] in ("vegetation", "clouds"):
            item["sourcePixelDifferences"] = int(np.count_nonzero(
                np.any(full_pixels != master_pixels, axis=2) & mask
            ))
            moving.append((full, mask))
        if entry["role"] in ("sky", "water", "architecture-ground", "foreground-occluder"):
            static.alpha_composite(full)
            static_owners += mask.astype(np.uint8)
        if entry["role"].endswith("light-mask"):
            item["opaqueNonwhitePixels"] = int(np.count_nonzero(
                np.any(pixels[:, :, :3] != 255, axis=2) & (pixels[:, :, 3] == 255)
            ))
        entries.append(item)

    restored = static.copy()
    for image, _ in moving:
        restored.alpha_composite(image)
    masks = [mask for _, mask in moving]
    union = np.logical_or.reduce(masks)
    ownership = np.sum(masks, axis=0)
    report = {
        "schema": "independent-pixel-source-review/v1",
        "reviewer": "/root/station_pixel_review",
        "scope": "Actual source PNG/masks only. No browser or runtime appearance assertion.",
        "manifestFileSha256": sha(manifest_path),
        "sourceSpecFileSha256": sha(spec_path),
        "sourceCanvas": list(master.size),
        "sourceScale": manifest["sourceScale"],
        "sourcePins": [{"id": key, "file": value["source"], "sha256": sha(ROOT / value["source"]),
                        "shaMatchesSpec": sha(ROOT / value["source"]) == value["sha256"]}
                       for key, value in spec["sources"].items()],
        "assets": entries,
        "restReassemblyDifferentPixels": int(np.count_nonzero(
            np.any(np.array(restored) != master_pixels, axis=2)
        )),
        "staticOutsideMovingMaskDifferentPixels": int(np.count_nonzero(
            np.any(np.array(static) != master_pixels, axis=2) & ~union
        )),
        "movingSelectionOverlapPixels": int(np.count_nonzero(ownership > 1)),
        "staticPlaneUnownedPixels": int(np.count_nonzero(static_owners == 0)),
        "staticPlaneMultiplyOwnedPixels": int(np.count_nonzero(static_owners > 1)),
        "masterDistinctOpaqueRgb": len(master.getcolors(master.width * master.height) or []),
        "manualReview": "See pixel-review.md for semantic findings and reviewed revision.",
        "productionAcceptance": False,
    }
    (OUT / "pixel-review-measurements.json").write_text(json.dumps(report, indent=2) + "\n")
    errors = []
    for entry in entries:
        for field in ("transparentRgbNonzeroPixels", "sourcePixelDifferences", "opaqueNonwhitePixels"):
            if entry.get(field, 0):
                errors.append(f"{entry['id']}: {field}")
        if set(entry["alphaValues"]) - {0, 255}:
            errors.append(f"{entry['id']}: non-binary alpha")
        for field in ("shaMatchesManifest", "publicCopyByteIdentical", "manifestDimensionsMatch"):
            if not entry[field]:
                errors.append(f"{entry['id']}: {field}")
    for field in ("restReassemblyDifferentPixels", "staticOutsideMovingMaskDifferentPixels",
                  "movingSelectionOverlapPixels", "staticPlaneUnownedPixels", "staticPlaneMultiplyOwnedPixels"):
        if report[field]:
            errors.append(field)
    if any(not source["shaMatchesSpec"] for source in report["sourcePins"]):
        errors.append("source pin mismatch")
    print(json.dumps({"result": "FAIL" if errors else "PASS_NUMERICAL_ONLY", "errors": errors,
                      "assets": len(entries), "manifestFileSha256": report["manifestFileSha256"]}))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
