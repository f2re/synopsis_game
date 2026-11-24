#!/usr/bin/env python3
"""Build the layered R09 station from pinned pixels and editable selection data.

The provider clean plate is used only below explicitly selected moving pixels.
Recombining the base layers at rest must reproduce the canonical master
byte-for-byte in RGBA. The runtime architecture plane samples the same
provider original at twice the texture density away from fixed edges. --check compares all generated
manifest copies and PNG outputs.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import struct
import zlib
from pathlib import Path

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "assets/source/environment/hub"
SPEC_PATH = ROOT / "assets/source/environment/hub/r09/source-spec.json"
GENERATED_ROOT = ROOT / "assets/generated/hub/r09"
PUBLIC_ROOT = ROOT / "apps/web/public/hub/r09"
ENGINE_MANIFEST = ROOT / "packages/world-engine/src/assets/hub/r09-manifest.json"
PUBLIC_PREFIX = "/hub/r09/"
CANVAS = (512, 288)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def png_bytes(image: Image.Image) -> bytes:
    stream = io.BytesIO()
    image.save(stream, format="PNG", compress_level=9, optimize=False)
    # Pillow wheels can link either zlib or zlib-ng. Preserve Pillow's PNG
    # filters and use Python's zlib to match the committed deflate profile.
    png = stream.getvalue()
    cursor = 8
    idat = bytearray()
    while cursor < len(png):
        length, kind = struct.unpack_from(">I4s", png, cursor)
        if kind == b"IDAT":
            idat.extend(png[cursor + 8:cursor + 8 + length])
        cursor += length + 12
    deflater = zlib.compressobj(9, zlib.DEFLATED, 15, 9, zlib.Z_FILTERED)
    compressed = deflater.compress(zlib.decompress(idat)) + deflater.flush()
    result = bytearray(png[:33])  # Signature and IHDR. Export images carry only pixel data.
    for offset in range(0, len(compressed), 65536):
        payload = compressed[offset:offset + 65536]
        chunk = b"IDAT" + payload
        result.extend(struct.pack(">I", len(payload)) + chunk + struct.pack(">I", zlib.crc32(chunk)))
    result.extend(png[-12:])  # IEND
    return bytes(result)


def pinned_image(description: dict, image_format: str = "PNG") -> tuple[Image.Image, bytes]:
    path = (ROOT / description["source"]).resolve()
    if not path.is_relative_to(SOURCE_ROOT.resolve()):
        raise ValueError("R09 images must stay inside assets/source/environment/hub")
    data = path.read_bytes()
    if digest(data) != description["sha256"]:
        raise ValueError(f"Source checksum changed: {description['source']}")
    with Image.open(io.BytesIO(data)) as source:
        expected_mode = "RGBA" if image_format == "PNG" else "RGB"
        if source.format != image_format or source.mode != expected_mode:
            raise ValueError(f"Expected {image_format} {expected_mode}: {description['source']}")
        image = source.convert("RGBA")
    if list(image.size) != description["size"]:
        raise ValueError(f"Source dimensions changed: {description['source']}")
    return image, data


def integer(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def polygon_mask(description: dict) -> Image.Image:
    mask = Image.new("L", CANVAS)
    draw = ImageDraw.Draw(mask)
    for field, value in (("polygons", 255), ("subtractPolygons", 0)):
        for polygon in description.get(field, []):
            if len(polygon) < 3:
                raise ValueError("Selection polygons need at least three vertices")
            for point in polygon:
                if len(point) != 2 or not all(integer(v) for v in point):
                    raise ValueError("Selection vertices must be integer source pixels")
                if not (0 <= point[0] < CANVAS[0] and 0 <= point[1] < CANVAS[1]):
                    raise ValueError("Selection vertex outside source canvas")
            draw.polygon([tuple(p) for p in polygon], fill=value)
    seen_rows = set()
    for row in description.get("rowSpans", []):
        if len(row) != 3 or not all(integer(v) for v in row):
            raise ValueError("Row spans are integer [y, left, rightInclusive]")
        y, left, right = row
        if y in seen_rows or not (0 <= y < CANVAS[1] and 0 <= left <= right < CANVAS[0]):
            raise ValueError("Duplicate row or invalid source row span")
        seen_rows.add(y)
        draw.line((left, y, right, y), fill=255)
    for row in description.get("rowSegments", []):
        if len(row) != 2 or not integer(row[0]) or not isinstance(row[1], list):
            raise ValueError("Row segments are [y, [[left, rightInclusive], ...]]")
        y, segments = row
        if y in seen_rows or not 0 <= y < CANVAS[1]:
            raise ValueError("Duplicate row or invalid source row segments")
        seen_rows.add(y)
        previous_end = -1
        for segment in segments:
            if len(segment) != 2 or not all(integer(v) for v in segment):
                raise ValueError("Invalid source row segment")
            left, right = segment
            if not 0 <= left <= right < CANVAS[0] or left <= previous_end:
                raise ValueError("Overlapping or invalid source row segments")
            previous_end = right
            draw.line((left, y, right, y), fill=255)
    if not mask.getbbox():
        raise ValueError("Empty source selection")
    return mask


def count(mask: Image.Image) -> int:
    return mask.histogram()[255]


def cutout(source: Image.Image, mask: Image.Image) -> Image.Image:
    """Select original RGBA pixels; fully transparent RGB is always zero."""
    if source.size != mask.size:
        raise ValueError("Cutout source and mask dimensions must match")
    result = Image.new("RGBA", source.size)
    result.paste(source, (0, 0), mask)
    return result


def difference_pixels(left: Image.Image, right: Image.Image) -> int:
    a, b = left.tobytes(), right.tobytes()
    return sum(a[i:i + 4] != b[i:i + 4] for i in range(0, len(a), 4))


def validate_rgba(image: Image.Image, *, opaque: bool = False) -> None:
    hist = image.getchannel("A").histogram()
    if sum(hist[1:255]):
        raise ValueError("R09 cutouts and masks require binary alpha")
    if opaque and hist[255] != image.width * image.height:
        raise ValueError("Master and hidden plate must be opaque")
    data = image.tobytes()
    if any(data[i + 3] == 0 and any(data[i:i + 3]) for i in range(0, len(data), 4)):
        raise ValueError("Nonzero RGB in a transparent pixel")


def color_cloud_mask(master: Image.Image, sky: Image.Image, description: dict) -> Image.Image:
    """Historical diagnostic selector. Production islands use explicit contours."""
    domain = sky.copy()
    if description.get("polygons"):
        domain = ImageChops.multiply(domain, polygon_mask(description))
    selected = bytearray(CANVAS[0] * CANVAS[1])
    pixels, allowed = master.tobytes(), domain.tobytes()
    for index, active in enumerate(allowed):
        if not active:
            continue
        red, green, blue, _ = pixels[index * 4:index * 4 + 4]
        light = .2126 * red + .7152 * green + .0722 * blue
        if (light >= description["minimumLuminance"]
                and red >= blue * description["minimumRedBlueRatio"]
                and green - red <= description["maximumGreenRedDifference"]):
            selected[index] = 255
    result = Image.frombytes("L", CANVAS, bytes(selected))
    if not result.getbbox():
        raise ValueError("Cloud recipe selected no source pixels")
    return result


def cloud_banks(master: Image.Image, sky: Image.Image, description: dict, clip: Image.Image | None = None) -> list[dict]:
    if description["kind"] == "cloud-color-selection-v1":
        return [{"id": "hub.r09.clouds", "file": "clouds.png", "mask": color_cloud_mask(master, sky, description), "motion": None}]
    if description["kind"] != "source-cluster-islands-v1":
        raise ValueError("Unknown cloud selection recipe")
    if clip is None or ImageChops.subtract(clip, sky).getbbox():
        raise ValueError("Cloud drift needs an explicit clip contained in the static sky domain")
    banks = []
    union = Image.new("L", CANVAS)
    ids = set()
    for island in description["islands"]:
        if island["id"] in ids:
            raise ValueError("Duplicate cloud island semantic ID")
        ids.add(island["id"])
        mask = polygon_mask(island["selection"])
        if ImageChops.multiply(mask, union).getbbox():
            raise ValueError("Cloud islands must not own the same source pixel")
        if ImageChops.subtract(mask, clip).getbbox():
            raise ValueError("Cloud source island touches a silhouette outside the reviewed clip")
        motion = island["motion"]
        expected_motion = {
            "kind": "continuous-east-drift-v1", "constantSourceY": mask.getbbox()[1],
            "speedSourcePixelsPerSecond": 0.55, "integerX": True,
            "wrapOnlyWhenFullyOffscreen": True,
        }
        if motion != expected_motion:
            raise ValueError("Cloud drift must preserve the reviewed fixed-y integer-x offscreen-wrap contract")
        if clip.getbbox()[1:4:2] != mask.getbbox()[1:4:2]:
            raise ValueError("Cloud clip must cover exactly the fixed source-height band")
        union = ImageChops.lighter(union, mask)
        banks.append({"id": island["id"], "file": island["file"], "mask": mask, "motion": motion})
    if not banks:
        raise ValueError("At least one complete cloud island is required")
    return banks


def clouds_mask(master: Image.Image, sky: Image.Image, description: dict, clip: Image.Image | None = None) -> Image.Image:
    mask = Image.new("L", CANVAS)
    for bank in cloud_banks(master, sky, description, clip):
        mask = ImageChops.lighter(mask, bank["mask"])
    return mask


def exact_sky_patch(master: Image.Image, sky: Image.Image, cloud_mask: Image.Image, description: dict) -> Image.Image:
    """Place an unchanged same-row source crop beneath the cloud's selected pixels."""
    if description["kind"] != "native-sky-region-copy":
        raise ValueError("Unknown native sky patch recipe")
    values = description["sourceRect"] + description["destination"]
    if len(values) != 6 or not all(integer(v) for v in values):
        raise ValueError("Native sky patch geometry must use integer source pixels")
    x, y, width, height, dest_x, dest_y = values
    if min(x, y, dest_x, dest_y) < 0 or min(width, height) <= 0:
        raise ValueError("Invalid native sky patch geometry")
    if y != dest_y:
        raise ValueError("Native sky patch must retain the original vertical colour ramp")
    if max(x + width, dest_x + width) > CANVAS[0] or max(y + height, dest_y + height) > CANVAS[1]:
        raise ValueError("Native sky patch exceeds the source canvas")
    source_area, destination_area = Image.new("L", CANVAS), Image.new("L", CANVAS)
    ImageDraw.Draw(source_area).rectangle((x, y, x + width - 1, y + height - 1), fill=255)
    ImageDraw.Draw(destination_area).rectangle((dest_x, dest_y, dest_x + width - 1, dest_y + height - 1), fill=255)
    if ImageChops.subtract(ImageChops.lighter(source_area, destination_area), sky).getbbox():
        raise ValueError("Native sky patch includes a non-sky silhouette")
    if ImageChops.multiply(source_area, cloud_mask).getbbox():
        raise ValueError("Native sky patch donor includes a selected cloud")
    if ImageChops.subtract(cloud_mask, destination_area).getbbox():
        raise ValueError("Native sky patch does not cover every selected cloud pixel")
    result = master.copy()
    result.paste(master.crop((x, y, x + width, y + height)), (dest_x, dest_y))
    return result


def mask_row_spans(mask: Image.Image) -> list[list[int]]:
    """Runtime scanline geometry uses end-exclusive bounds, unlike authoring rows."""
    pixels = mask.load()
    rows = []
    for y in range(CANVAS[1]):
        start = None
        for x in range(CANVAS[0] + 1):
            active = x < CANVAS[0] and pixels[x, y] == 255
            if active and start is None:
                start = x
            elif not active and start is not None:
                rows.append([y, start, x])
                start = None
    return rows


def build_outputs(spec: dict) -> tuple[dict[str, bytes], dict]:
    if spec.get("schema") != "synopsis-station-r09-source/v1":
        raise ValueError("Unsupported R09 source specification")
    if spec["sourceCanvas"] != list(CANVAS) or spec["worldCanvas"] != list(CANVAS) or spec["sourceScale"] != 1:
        raise ValueError("R09 uses native 512x288 coordinates and one shared transform")
    master, _ = pinned_image(spec["sources"]["master"])
    donor, _ = pinned_image(spec["sources"]["hiddenPlate"])
    sky_donor = donor
    if spec["sources"].get("skyHiddenPlate"):
        sky_donor, _ = pinned_image(spec["sources"]["skyHiddenPlate"])
    if master.size != CANVAS or donor.size != CANVAS or sky_donor.size != CANVAS:
        raise ValueError("Master and hidden plate must share the exact native canvas")
    validate_rgba(master, opaque=True)
    validate_rgba(donor, opaque=True)
    validate_rgba(sky_donor, opaque=True)

    sky_domain = polygon_mask(spec["domains"]["sky"])
    water_domain = polygon_mask(spec["domains"]["water"])
    front_domain = polygon_mask(spec["domains"]["foreground"])
    cloud_clip = polygon_mask(spec["domains"]["cloudClip"])
    if ImageChops.multiply(sky_domain, water_domain).getbbox():
        raise ValueError("Sky and water domains must not overlap")
    if ImageChops.multiply(front_domain, ImageChops.lighter(sky_domain, water_domain)).getbbox():
        raise ValueError("Foreground domain must not overlap sky or water")

    banks = cloud_banks(master, sky_domain, spec["cloudSelection"], cloud_clip)
    cloud_mask = Image.new("L", CANVAS)
    for bank in banks:
        cloud_mask = ImageChops.lighter(cloud_mask, bank["mask"])
    if spec.get("skyPatch"):
        sky_donor = exact_sky_patch(master, sky_domain, cloud_mask, spec["skyPatch"])
    moving_mask = cloud_mask.copy()
    vegetation_masks: dict[str, Image.Image] = {}
    for entry in spec["vegetation"]:
        if entry["id"] in vegetation_masks:
            raise ValueError("Duplicate vegetation semantic ID")
        mask = polygon_mask(entry["selection"])
        if ImageChops.multiply(mask, moving_mask).getbbox():
            raise ValueError(f"Moving source selections overlap: {entry['id']}")
        if not 0 < entry["gain"] <= 1.5 or not 0 < entry["rootFraction"] < 1:
            raise ValueError("Vegetation motion must keep its anchor and use gain <= 1.5")
        if entry.get("maximumSourceDisplacement") != 1:
            raise ValueError("Vegetation motion must use the reviewed one-source-pixel hard cap")
        if entry["kind"] not in {"tree", "shrub", "grass", "reed", "flag"}:
            raise ValueError("Unsupported vegetation motion kind")
        vegetation_masks[entry["id"]] = mask
        moving_mask = ImageChops.lighter(moving_mask, mask)

    base = master.copy()
    base.paste(donor, (0, 0), ImageChops.subtract(moving_mask, cloud_mask))
    base.paste(sky_donor, (0, 0), cloud_mask)
    outside = ImageChops.invert(moving_mask)
    if cutout(base, outside).tobytes() != cutout(master, outside).tobytes():
        raise ValueError("Hidden plate changed pixels outside moving selections")

    architecture_domain = ImageChops.invert(ImageChops.lighter(
        ImageChops.lighter(sky_domain, water_domain), front_domain,
    ))
    planes = [
        ("hub.r09.sky", "sky", "sky.png", cutout(base, sky_domain), 0),
        ("hub.r09.water", "water", "water.png", cutout(base, water_domain), 1),
        ("hub.r09.architecture-ground", "architecture-ground", "architecture-ground.png", cutout(base, architecture_domain), 2),
        ("hub.r09.foreground", "foreground-occluder", "foreground.png", cutout(base, front_domain), 260),
    ]
    planes.extend((bank["id"], "clouds", bank["file"], cutout(master, bank["mask"]), 1) for bank in banks)
    restored = Image.new("RGBA", CANVAS)
    for _, _, _, plane, _ in planes:
        restored.alpha_composite(plane)
    for entry in spec["vegetation"]:
        restored.alpha_composite(cutout(master, vegetation_masks[entry["id"]]))
    if restored.tobytes() != master.tobytes():
        raise ValueError("Layer assembly at rest must restore the exact master RGBA")

    outputs: dict[str, bytes] = {}
    assets = []

    def emit(asset_id: str, role: str, filename: str, full: Image.Image, depth: int, extra: dict | None = None, crop: bool = True, density: int = 1) -> None:
        if Path(filename).name != filename or not filename.endswith(".png"):
            raise ValueError("Export filenames must be plain PNG names")
        if filename in outputs or any(a["id"] == asset_id for a in assets):
            raise ValueError("Duplicate output filename or semantic ID")
        box = full.getbbox() if crop else (0, 0, *CANVAS)
        if box is None:
            raise ValueError(f"Empty export: {asset_id}")
        image = full.crop(box)
        validate_rgba(image)
        data = png_bytes(image)
        outputs[filename] = data
        x, y, logical_width, logical_height = (
            box[0] // density, box[1] // density, image.width // density, image.height // density,
        )
        anchor = [x + logical_width / 2, y + logical_height]
        asset = {
            "id": asset_id, "role": role, "key": asset_id.replace(".", "_"),
            "url": PUBLIC_PREFIX + filename, "width": image.width, "height": image.height,
            "originalSceneXY": [x, y], "sourceBounds": [x, y, logical_width, logical_height],
            "pivotLocalPx": [image.width / 2, image.height], "anchorScenePx": anchor,
            "depthSourceY": depth, "alphaPolicy": "binary", "sha256": digest(data), "bytes": len(data),
        }
        if density != 1:
            asset["density"] = density
        if extra:
            asset.update(extra)
        assets.append(asset)

    detail_source, _ = pinned_image(spec["sources"]["architectureDetail"], "JPEG")
    detail_size = (CANVAS[0] * 2, CANVAS[1] * 2)
    if min(detail_source.width / detail_size[0], detail_source.height / detail_size[1]) < 1:
        raise ValueError("Architecture detail must come from a higher-resolution source")
    if detail_source.resize(CANVAS, Image.Resampling.NEAREST).tobytes() != master.tobytes():
        raise ValueError("Architecture detail is not registered to the original master")
    # Keep a logical pixel around moving silhouettes and layer seams. The
    # reviewed source-grid masks still own their edges in all weather states.
    detail_mask = ImageChops.subtract(architecture_domain, moving_mask).filter(ImageFilter.MinFilter(3))
    detail_mask = detail_mask.resize(detail_size, Image.Resampling.NEAREST)
    detail = detail_source.resize(detail_size, Image.Resampling.BOX)
    for asset_id, role, filename, image, depth in planes:
        extra = {"sourcePixelsExact": role == "clouds"}
        if role == "clouds":
            extra["motionReady"] = spec["review"].get("cloudMotionReady", False)
            extra["motionReview"] = spec["review"].get("cloudMotion", "pending-independent-review")
            extra["motion"] = next(bank["motion"] for bank in banks if bank["id"] == asset_id)
            extra["clipDomain"] = "cloudClip"
        if role == "architecture-ground":
            # Composite the opaque detail here, once. At runtime only one
            # architecture quad spans the plaza and façades.
            image = image.resize(detail_size, Image.Resampling.NEAREST)
            image.paste(detail, (0, 0), detail_mask)
            emit(asset_id, role, filename, image, depth, extra, density=2)
        else:
            emit(asset_id, role, filename, image, depth, extra)
    for entry in spec["vegetation"]:
        emit(entry["id"], "vegetation", entry["file"], cutout(master, vegetation_masks[entry["id"]]), entry["depthSourceY"], {
            "kind": entry["kind"], "rootFraction": entry["rootFraction"], "gain": entry["gain"],
            "maximumSourceDisplacement": entry["maximumSourceDisplacement"],
            "sourcePixelsExact": True, "movingPixels": count(vegetation_masks[entry["id"]]),
            "maskRecipe": "editable-source-row-spans-or-polygons",
        })
    for entry in spec["receivers"]:
        image, _ = pinned_image(entry)
        if image.size != CANVAS:
            raise ValueError("Light receiver masks must share the full native canvas")
        validate_rgba(image)
        pixels = image.tobytes()
        if any(pixels[i + 3] and pixels[i:i + 3] != bytes((255, 255, 255)) for i in range(0, len(pixels), 4)):
            raise ValueError("Light receiver masks must be white selected pixels")
        edits = []
        for edit in entry.get("edits", []):
            if entry["role"] not in {"ground-light-mask", "window-light-mask"}:
                raise ValueError("Editable R09 receiver changes are restricted to ground or window masks")
            region = next((region for region in spec["lightRegions"]
                           if region["id"] == edit["lightRegionId"]), None)
            if region is None or region["maskRole"] != entry["role"]:
                raise ValueError("Receiver edit references a missing receiver or mismatched light region")
            cleared_pixels = 0
            if "clearBounds" in edit:
                clear = edit["clearBounds"]
                if (entry["role"] != "window-light-mask" or len(clear) != 4
                        or not all(integer(v) for v in clear)):
                    raise ValueError("Only window receiver edits may clear integer source bounds")
                cx, cy, cw, ch = clear
                if min(cx, cy) < 0 or min(cw, ch) <= 0 or cx + cw > CANVAS[0] or cy + ch > CANVAS[1]:
                    raise ValueError("Receiver clear bounds exceed the source canvas")
                cleared_pixels = count(image.getchannel("A").crop((cx, cy, cx + cw, cy + ch)))
                image.paste((0, 0, 0, 0), (cx, cy, cx + cw, cy + ch))
            selection = polygon_mask(edit["selection"])
            if ImageChops.multiply(selection, image.getchannel("A")).getbbox():
                raise ValueError("A receiver edit must not overwrite unrelated source-mask pixels")
            if ImageChops.multiply(selection, moving_mask).getbbox():
                raise ValueError("Receiver edits must not illuminate moving foliage or clouds")
            x, y, width, height = region["sourceBounds"]
            bounds = Image.new("L", CANVAS)
            ImageDraw.Draw(bounds).rectangle((x, y, x + width - 1, y + height - 1), fill=255)
            if ImageChops.subtract(selection, bounds).getbbox():
                raise ValueError("Receiver edit extends outside its light region")
            image.paste((255, 255, 255, 255), (0, 0, *CANVAS), selection)
            left, top, right, bottom = selection.getbbox()
            edits.append({"id": edit["id"], "lightRegionId": edit["lightRegionId"],
                          "selectedPixels": count(selection), "clearedSourceMaskPixels": cleared_pixels,
                          "clearBounds": edit.get("clearBounds"),
                          "sourceBounds": [left, top, right - left, bottom - top]})
        emit(entry["id"], entry["role"], entry["file"], image, 280, {
            "blendMode": "receiver-mask",
            **({"maskRecipe": "pinned-source-mask-with-reviewed-source-pixel-edits",
                "sourceMaskEdits": edits} if edits else {}),
        }, crop=False)
    receiver_roles = {entry["role"] for entry in spec["receivers"]}
    for region in spec["lightRegions"]:
        if region["maskRole"] not in receiver_roles:
            raise ValueError("Light region references a missing receiver")
        x, y, width, height = region["sourceBounds"]
        if not all(integer(v) for v in (x, y, width, height)) or min(x, y) < 0 or min(width, height) <= 0:
            raise ValueError("Light region bounds must use positive integer source pixels")
        if x + width > CANVAS[0] or y + height > CANVAS[1]:
            raise ValueError("Light region outside source canvas")
        if "verticalFalloff" in region:
            falloff = region["verticalFalloff"]
            if (not isinstance(falloff, list) or len(falloff) != 2
                    or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in falloff)
                    or not 0 <= falloff[1] <= falloff[0] <= 1):
                raise ValueError("Light falloff must be two bounded descending source-row factors")

    runtime_domains = json.loads(json.dumps(spec["domains"]))
    runtime_domains["water"]["rowSpans"] = mask_row_spans(water_domain)
    runtime_domains["water"]["rowSpanConvention"] = "[sourceY, sourceXStart, sourceXEndExclusive]"
    runtime_domains["sky"]["rowSpans"] = mask_row_spans(sky_domain)
    runtime_domains["sky"]["rowSpanConvention"] = "[sourceY, sourceXStart, sourceXEndExclusive]"
    runtime_domains["cloudClip"]["rowSpans"] = mask_row_spans(cloud_clip)
    runtime_domains["cloudClip"]["rowSpanConvention"] = "[sourceY, sourceXStart, sourceXEndExclusive]"
    runtime = {
        "id": "hub.r09-station", "schema": "synopsis-station-r09-runtime/v1", "version": 1,
        "status": spec["review"]["status"], "review": spec["review"],
        "sourceCanvas": list(CANVAS), "worldCanvas": list(CANVAS), "sourceScale": 1,
        "assets": assets, "lightRegions": spec["lightRegions"], "domains": runtime_domains,
        "sourceSpec": str(SPEC_PATH.relative_to(ROOT)), "sourceSpecCanonicalSha256": digest(json_bytes(spec)),
        "provenance": spec["provenance"],
        "validation": {
            "sourceHashesVerified": True, "restRoundtripRgbaExact": True,
            "outsideMovingMaskChangedPixels": 0, "hiddenPlateUsedPixels": count(moving_mask),
            "hiddenPlateChangedPixels": difference_pixels(master, base),
            "cloudPixels": count(cloud_mask), "vegetationPieces": len(vegetation_masks),
            "cloudIslands": len(banks), "cloudSilhouetteClearanceVerified": True,
            "cloudClipPixels": count(cloud_clip), "cloudClipDomain": "cloudClip",
            "skyPatchMode": spec.get("skyPatch", {}).get("kind", "provider-hidden-plate"),
            "masterRgbaSha256": digest(master.tobytes()), "exportResampling": "box, architecture detail only",
            "paletteQuantization": False, "artAcceptanceImplied": False,
            "pngBytes": sum(len(data) for data in outputs.values()),
            "decodedRgbaBytes": sum(a["width"] * a["height"] * 4 for a in assets),
        },
    }
    outputs["manifest.json"] = json_bytes(runtime)
    return outputs, runtime


def write_or_check(outputs: dict[str, bytes], check: bool) -> None:
    for directory in (GENERATED_ROOT, PUBLIC_ROOT):
        if directory.exists():
            for path in directory.iterdir():
                if path.is_file() and path.name not in outputs and path.suffix in {".png", ".json"}:
                    if check:
                        raise ValueError(f"Stale unreferenced R09 output: {path.relative_to(ROOT)}")
                    path.unlink()
    files = [(directory / filename, data) for directory in (GENERATED_ROOT, PUBLIC_ROOT) for filename, data in outputs.items()]
    files.append((ENGINE_MANIFEST, outputs["manifest.json"]))
    for path, data in files:
        if check:
            if not path.is_file() or path.read_bytes() != data:
                raise ValueError(f"Stale or missing R09 output: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists() or path.read_bytes() != data:
                path.write_bytes(data)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Read-only byte reproducibility check")
    args = parser.parse_args()
    if PIL.__version__ != "13.0.0":
        raise ValueError("Use tools/assets/requirements-r01.txt (Pillow 13.0.0)")
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    outputs, runtime = build_outputs(spec)
    write_or_check(outputs, args.check)
    print(json.dumps({"result": "CHECK" if args.check else "BUILT", "assets": len(runtime["assets"]), **runtime["validation"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
