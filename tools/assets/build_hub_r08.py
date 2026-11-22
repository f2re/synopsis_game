#!/usr/bin/env python3
"""Export the isolated R08 art preview without changing the accepted R01 pipeline.

The input manifest pins candidate PNGs and editable polygon specifications. No
resampling, quantization, full-frame donor substitution or provider call occurs.
The local archive plate replaces only the facade's owned alpha footprint. Normal
builds write generated/public outputs; --check is read-only. --prepare-pilot-sources
is an explicit authoring step for the PNGs described by the pilot mask spec.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import PIL
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "assets/manifests/hub.r08-preview.json"
SOURCE_ROOT = Path("assets/source/environment/hub/r08")
GENERATED_ROOT = Path("assets/generated/hub/r08-preview")
PUBLIC_ROOT = Path("apps/web/public/hub/r08-preview")
PUBLIC_PREFIX = "/hub/r08-preview/"
SCHEMA = "synopsis-r08-preview-export/v1"
CANVAS = (512, 288)
REQUIRED_ROLES = {
    "master", "archive-local-ground", "archive-facade",
    "archive-porch-steps", "archive-entry-lamp",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def source_path(relative: str) -> Path:
    path = (ROOT / relative).resolve()
    if not path.is_relative_to((ROOT / SOURCE_ROOT).resolve()):
        raise ValueError(f"R08 source path must stay in {SOURCE_ROOT}: {relative}")
    return path


def pinned_bytes(description: dict) -> bytes:
    path = source_path(description["source"])
    data = path.read_bytes()
    if digest(data) != description["sourceSha256"]:
        raise ValueError(f"Source checksum changed: {description['source']}")
    return data


def rgba(data: bytes, label: str) -> Image.Image:
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "PNG" or image.mode != "RGBA":
            raise ValueError(f"Expected actual PNG RGBA: {label}")
        image.load()
        return image.copy()


def png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG", compress_level=9, optimize=False)
    return output.getvalue()


def count_nonzero(mask: Image.Image) -> int:
    return sum(mask.histogram()[1:])


def validate_alpha(image: Image.Image, entry: dict) -> None:
    policy = entry["alphaPolicy"]
    histogram = image.getchannel("A").histogram()
    if policy == "opaque":
        if histogram[255] != image.width * image.height:
            raise ValueError(f"Expected opaque image: {entry['id']}")
    elif policy == "binary":
        if sum(histogram[1:255]):
            raise ValueError(f"Fractional alpha is not allowed: {entry['id']}")
    elif policy == "effect-fractional":
        if not entry.get("effectException"):
            raise ValueError(f"Fractional-alpha effects require an explicit exception: {entry['id']}")
    else:
        raise ValueError(f"Unknown alpha policy: {policy}")
    raw = image.tobytes()
    if any(raw[i + 3] == 0 and any(raw[i:i + 3]) for i in range(0, len(raw), 4)):
        raise ValueError(f"Nonzero RGB in fully transparent pixels: {entry['id']}")


def placed(image: Image.Image, xy: list[int]) -> Image.Image:
    x, y = xy
    if not all(isinstance(v, int) for v in xy) or min(x, y) < 0:
        raise ValueError(f"Invalid source-space coordinate: {xy}")
    if x + image.width > CANVAS[0] or y + image.height > CANVAS[1]:
        raise ValueError(f"Layer exceeds the common source canvas: {xy}, {image.size}")
    output = Image.new("RGBA", CANVAS)
    output.paste(image, (x, y))
    return output


def render_pilot_sources(manifest: dict) -> dict[str, Image.Image]:
    """Reproduce source-exact slices and white binary receiver masks from polygons."""
    descriptor = manifest.get("pilotSpec")
    if not descriptor:
        return {}
    spec = json.loads(pinned_bytes(descriptor))
    if spec.get("schema") != "synopsis-r08-pilot-masks/v1":
        raise ValueError("Unsupported editable pilot-mask specification")
    if len({layer["source"] for layer in spec["layers"]}) != len(spec["layers"]):
        raise ValueError("Pilot source paths must have exactly one mask recipe")
    master_entry = next(a for a in manifest["assets"] if a["role"] == "master")
    master = rgba(pinned_bytes(master_entry), master_entry["id"])
    if spec["sourceSha256"] != master_entry["sourceSha256"] or spec["sourceCanvas"] != list(CANVAS):
        raise ValueError("Pilot mask specification is bound to a different source")
    result = {}
    for layer in spec["layers"]:
        mask = Image.new("L", CANVAS)
        draw = ImageDraw.Draw(mask)
        for polygon in layer["polygons"]:
            for point in polygon:
                if len(point) != 2 or any(not isinstance(v, int) for v in point):
                    raise ValueError(f"Polygon vertices must be integer source pixels: {layer['id']}")
                if not (0 <= point[0] < CANVAS[0] and 0 <= point[1] < CANVAS[1]):
                    raise ValueError(f"Polygon vertex outside the source canvas: {layer['id']}")
            draw.polygon([tuple(p) for p in polygon], fill=255)
        for polygon in layer.get("subtractPolygons", []):
            draw.polygon([tuple(p) for p in polygon], fill=0)
        if not mask.getbbox():
            raise ValueError(f"Empty pilot mask: {layer['id']}")
        image = Image.new("RGBA", CANVAS)
        if layer["kind"] == "source-cutout":
            image.paste(master, (0, 0), mask)
        elif layer["kind"] == "binary-receiver-mask":
            image.paste((255, 255, 255, 255), (0, 0, *CANVAS), mask)
        elif layer["kind"] == "material-refinement":
            donor = rgba(pinned_bytes(layer["donor"]), layer["id"])
            if donor.size != CANVAS:
                raise ValueError("Material swatches must use the canonical scene grid")
            paint = ImageDraw.Draw(image)
            for swatch in layer["paint"]:
                color = (*swatch["rgb"], 255) if "rgb" in swatch else donor.getpixel(tuple(swatch["sampleXY"]))
                paint.polygon([tuple(point) for point in swatch["polygon"]], fill=color)
            if ImageChops.multiply(image.getchannel("A"), ImageChops.invert(mask)).getbbox():
                raise ValueError("A material swatch exceeds its authored receiver domain")
        else:
            raise ValueError(f"Unknown pilot layer kind: {layer['kind']}")
        box = layer.get("cropRectXYWH")
        if box:
            x, y, width, height = box
            if mask.getbbox() != (x, y, x + width, y + height):
                raise ValueError(f"Pilot crop must match its exact mask bounds: {layer['id']}")
            image = image.crop((x, y, x + width, y + height))
        result[layer["source"]] = image
    return result


def prepare_pilot_sources(manifest: dict) -> None:
    for relative, image in render_pilot_sources(manifest).items():
        path = source_path(relative)
        if not path.is_relative_to((ROOT / SOURCE_ROOT / "pilot").resolve()):
            raise ValueError("Explicit source preparation is restricted to r08/pilot")
        data = png_bytes(image)
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)
        print(f"SOURCE {relative}: {image.width}x{image.height} sha256={digest(data)}")
    print("Source preparation does not approve art or update pinned source hashes; review manifest pins before export.")


def build_outputs(manifest: dict) -> dict[str, bytes]:
    if manifest["schema"] != SCHEMA or manifest["sourceCanvas"] != list(CANVAS):
        raise ValueError("Unexpected R08 preview schema or source canvas")
    if manifest["worldCanvas"] != [960, 540] or manifest["sharedTransform"] != {
        "scale": 1.875, "offset": [0, 0], "sampling": "nearest", "productionGridApproved": False,
    }:
        raise ValueError("R08 uses one explicit preview transform; production grid approval is separate")
    if manifest["review"]["productionReady"] or manifest.get("production_status") != "candidate":
        raise ValueError("This exporter is restricted to an isolated candidate preview")
    entries = manifest["assets"]
    roles = [a["role"] for a in entries]
    if len(set(roles)) != len(roles) or not REQUIRED_ROLES.issubset(roles):
        raise ValueError("R08 preview roles must be unique and include the five archive baseline roles")
    if len({a["id"] for a in entries}) != len(entries):
        raise ValueError("Duplicate semantic asset ID")
    if len({a["file"] for a in entries}) != len(entries):
        raise ValueError("Duplicate output filename")
    images: dict[str, Image.Image] = {}
    data_by_role: dict[str, bytes] = {}
    by_role = {a["role"]: a for a in entries}
    expected_pilot = render_pilot_sources(manifest)
    for entry in entries:
        if Path(entry["file"]).name != entry["file"] or not entry["file"].endswith(".png"):
            raise ValueError(f"Expected a plain PNG output filename: {entry['file']}")
        if entry["operation"] == "copy":
            data = pinned_bytes(entry)
            image = rgba(data, entry["id"])
            if image.size != tuple(entry["size"]):
                raise ValueError(f"Native dimensions changed: {entry['id']}")
            validate_alpha(image, entry)
            placed(image, entry["originalSceneXY"])
            expected = expected_pilot.get(entry["source"])
            if expected is not None and expected.tobytes() != image.tobytes():
                raise ValueError(f"Pilot source no longer matches its editable polygons: {entry['id']}")
            if "anchorScenePx" in entry:
                xy, pivot = entry["originalSceneXY"], entry["pivotLocalPx"]
                if [xy[i] + pivot[i] for i in (0, 1)] != entry["anchorScenePx"]:
                    raise ValueError(f"Pivot/scene anchor mismatch: {entry['id']}")
            images[entry["role"]], data_by_role[entry["role"]] = image, data
        elif entry["operation"] != "archive-local-patch" or entry["role"] != "archive-local-ground":
            raise ValueError(f"Unsupported export operation: {entry['id']}")
    master = images["master"]
    if master.size != CANVAS or by_role["master"]["originalSceneXY"] != [0, 0]:
        raise ValueError("Master must cover the entire canonical scene")
    for entry in entries:
        if entry.get("sourcePixelsExact"):
            full = placed(images[entry["role"]], entry["originalSceneXY"])
            mask = full.getchannel("A")
            difference = ImageChops.difference(full, master).convert("RGB")
            difference.paste((0, 0, 0), mask=ImageChops.invert(mask))
            if difference.getbbox():
                raise ValueError(f"Selected visible RGB changed from master: {entry['id']}")
    archive_roles = ("archive-facade", "archive-porch-steps", "archive-entry-lamp")
    union = Image.new("L", CANVAS)
    archive_layers = []
    for role in archive_roles:
        full = placed(images[role], by_role[role]["originalSceneXY"])
        mask = full.getchannel("A")
        if ImageChops.multiply(mask, union).getbbox():
            raise ValueError("Archive layers overlap; each selected pixel needs one owner")
        union = ImageChops.lighter(union, mask)
        archive_layers.append(full)
    ground_entry = by_role["archive-local-ground"]
    if ground_entry["operation"] != "archive-local-patch":
        raise ValueError("The archive ground must be a local mask-only patch")
    donor = rgba(pinned_bytes(ground_entry["donor"]), "archive local donor")
    if donor.size != CANVAS:
        raise ValueError("Archive donor must share the canonical scene grid")
    facade_mask = archive_layers[0].getchannel("A")
    ground = master.copy()
    ground.paste(donor, (0, 0), facade_mask)
    restored = ground.copy()
    for full in archive_layers:
        restored.alpha_composite(full)
    if restored.tobytes() != master.tobytes():
        raise ValueError("Archive source roundtrip failed")
    if ground.size != tuple(ground_entry["size"]) or ground_entry["originalSceneXY"] != [0, 0]:
        raise ValueError("Local ground must remain a full scene plate")
    images["archive-local-ground"] = ground
    data_by_role["archive-local-ground"] = png_bytes(ground)
    outputs = {}
    runtime_assets = []
    for entry in entries:
        image, data = images[entry["role"]], data_by_role[entry["role"]]
        outputs[entry["file"]] = data
        runtime_entry = {
            "id": entry["id"], "role": entry["role"], "url": PUBLIC_PREFIX + entry["file"],
            "width": image.width, "height": image.height,
            "originalSceneXY": entry["originalSceneXY"], "pivotLocalPx": entry["pivotLocalPx"],
            "sha256": digest(data), "bytes": len(data), "alphaPolicy": entry["alphaPolicy"],
        }
        for key in ("anchorScenePx", "depthSourceY", "blendMode", "usage"):
            if key in entry:
                runtime_entry[key] = entry[key]
        runtime_assets.append(runtime_entry)
    runtime = {key: manifest[key] for key in (
        "version", "status", "sourceCanvas", "worldCanvas", "sharedTransform", "npc", "archive", "review", "optionalRoles",
    )}
    runtime["assets"] = runtime_assets
    runtime["sourceManifest"] = "assets/manifests/hub.r08-preview.json"
    runtime["sourceManifestCanonicalSha256"] = digest(json_bytes(manifest))
    runtime["lightRegions"] = manifest.get("lightRegions", [])
    for region in runtime["lightRegions"]:
        if region["maskRole"] not in images:
            raise ValueError(f"Light region references a missing mask: {region['id']}")
        x, y, width, height = region["sourceBounds"]
        if not all(isinstance(v, int) for v in (x, y, width, height)) or min(x, y) < 0 or min(width, height) <= 0:
            raise ValueError(f"Invalid light region bounds: {region['id']}")
        if x + width > CANVAS[0] or y + height > CANVAS[1] or not 0 <= region["suggestedAlpha"] <= 1:
            raise ValueError(f"Light region exceeds the preview contract: {region['id']}")
        if images[region["maskRole"]].size != CANVAS or by_role[region["maskRole"]]["originalSceneXY"] != [0, 0]:
            raise ValueError("Light receiver masks must use the full source canvas")
    runtime["validation"] = {
        "sourceHashesVerified": True, "archiveSourcePixelsExact": True,
        "archiveMaskPixels": count_nonzero(facade_mask), "archiveUnionPixels": count_nonzero(union),
        "outsideArchiveMaskChangedPixels": 0, "archiveRoundtripRgbaExact": True,
        "masterRgbaSha256": digest(master.tobytes()), "exportResampling": "none",
        "artAcceptanceImplied": False,
    }
    outputs["manifest.json"] = json_bytes(runtime)
    return outputs


def write_or_check(outputs: dict[str, bytes], check: bool) -> None:
    for directory in (GENERATED_ROOT, PUBLIC_ROOT):
        for name, data in outputs.items():
            path = ROOT / directory / name
            if check:
                if not path.is_file() or path.read_bytes() != data:
                    raise ValueError(f"Stale or missing R08 preview output: {path.relative_to(ROOT)}")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                if not path.exists() or path.read_bytes() != data:
                    path.write_bytes(data)
    print(f"{'CHECK' if check else 'BUILT'} hub.r08-preview: {len(outputs) - 1} PNGs + manifest; source pixels retained, production approval pending")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--check", action="store_true", help="Compare every generated/public byte; do not write")
    group.add_argument("--prepare-pilot-sources", action="store_true", help="Explicitly reproduce r08/pilot source PNGs from their editable polygons")
    args = parser.parse_args()
    if PIL.__version__ != "13.0.0":
        raise ValueError("Use the pinned tools/assets/requirements-r01.txt (Pillow 13.0.0)")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if args.prepare_pilot_sources:
        prepare_pilot_sources(manifest)
    else:
        write_or_check(build_outputs(manifest), args.check)


if __name__ == "__main__":
    main()
