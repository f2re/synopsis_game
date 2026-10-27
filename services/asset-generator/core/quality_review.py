from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any
from PIL import Image

from core.asset_classes import OCCUPANCY_CONTRACTS, PALETTE_CONTRACTS, classify_asset, get_generation_profile
from core.pixel_refiner import remove_neutral_background


def evaluate_asset_candidate(
    image_path: Path,
    asset_spec: dict[str, Any],
    palette: list[tuple[int, int, int]] | None = None,
    art_verdict_override: dict[str, Any] | None = None,
    is_raw: bool = False,
) -> dict[str, Any]:
    """Performs technical contract check and visual/art QA scoring on a pixel candidate."""
    if not image_path.is_file():
        return {
            "production_status": "rejected",
            "technical_status": {"value": "fail", "reasons": [f"File not found: {image_path}"]},
            "art_status": {"value": "fail", "reasons": ["File not found"]},
            "metrics": {},
        }

    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    analysis = img.copy()
    if is_raw:
        analysis.thumbnail((512, 512), Image.Resampling.LANCZOS)
        # Raw icons commonly have a solid matte; it is not the subject.
        if asset_spec.get("alpha") == "transparent" and analysis.getextrema()[3] == (255, 255):
            analysis = remove_neutral_background(analysis)
    aw, ah = analysis.size
    pixels = analysis.load()

    target_size = asset_spec.get("size", [w, h])
    exp_w, exp_h = target_size

    tech_reasons: list[str] = []
    art_reasons: list[str] = []

    # 1. Technical checks (only enforced for refined/production candidates, not raw drafts)
    if not is_raw:
        if (w, h) != (exp_w, exp_h):
            tech_reasons.append(f"Size mismatch: actual {(w, h)} != expected {(exp_w, exp_h)}")
        frame = asset_spec.get("frame")
        if frame and (len(frame) != 2 or not all(isinstance(v, int) and v > 0 for v in frame)
                      or w % frame[0] or h % frame[1]):
            tech_reasons.append("Sprite sheet does not align to its frame grid")

        alphas = sorted({pixels[x, y][3] for y in range(h) for x in range(w)})
        if not set(alphas).issubset({0, 255}):
            tech_reasons.append(f"Fractional alpha forbidden (only 0 or 255 allowed): found {alphas}")

        opaque_pixels = [pixels[x, y][:3] for y in range(h) for x in range(w) if pixels[x, y][3] == 255]
        unique_opaque = set(opaque_pixels)
        if asset_spec.get("alpha") == "transparent" and not opaque_pixels:
            tech_reasons.append("Transparent asset has no opaque foreground pixels")

        asset_class = classify_asset(asset_spec.get("id", ""), asset_spec)
        strict_palette = get_generation_profile(asset_class).get("palette", {}).get("strictQuantization", False)
        if palette and strict_palette:
            pal_set = set(palette)
            outside = [c for c in unique_opaque if c not in pal_set]
            if outside:
                tech_reasons.append(f"{len(outside)} colors outside target palette")
    else:
        # For raw candidates: verify aspect ratio alignment
        aspect_actual = w / float(h)
        aspect_expected = exp_w / float(exp_h)
        if abs(aspect_actual - aspect_expected) > 0.25:
            art_reasons.append(f"Raw candidate aspect ratio mismatch: {w}x{h} ({aspect_actual:.2f}) vs target {exp_w}x{exp_h} ({aspect_expected:.2f})")
        opaque_pixels = [pixels[x, y][:3] for y in range(ah) for x in range(aw) if pixels[x, y][3] >= 128]
        unique_opaque = set(opaque_pixels)
        alphas = [255]

    asset_class = classify_asset(asset_spec.get("id", ""), asset_spec)
    pal_contract = PALETTE_CONTRACTS.get(asset_class, {})
    target_range = pal_contract.get("target_range", (16, 40))
    soft_max = pal_contract.get("hard_max", asset_spec.get("max_colors", 64))

    diagnostics: list[str] = []
    if not is_raw:
        if len(unique_opaque) > soft_max:
            diagnostics.append(f"Diagnostic note: color count ({len(unique_opaque)}) exceeds soft max guideline ({soft_max})")
        elif len(unique_opaque) < target_range[0]:
            diagnostics.append(f"Diagnostic note: color count ({len(unique_opaque)}) below target minimum ({target_range[0]})")

    # 2. Structural & Art QA metrics
    bbox = analysis.getbbox()  # (left, top, right, bottom)
    if not bbox:
        art_reasons.append("Image is completely transparent or empty")
        occ_x = occ_y = 0.0
    else:
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        occ_x = bw / float(aw)
        occ_y = bh / float(ah)

    contract = OCCUPANCY_CONTRACTS.get(asset_class, {})

    if contract:
        min_x = contract.get("min_x", 0.0)
        max_x = contract.get("max_x", 1.0)
        min_y = contract.get("min_y", 0.0)
        max_y = contract.get("max_y", 1.0)

        if occ_x < min_x:
            art_reasons.append(f"Subject horizontal occupancy too small: {occ_x:.2f} < {min_x:.2f}")
        elif occ_x > max_x:
            art_reasons.append(f"Subject horizontal occupancy too crowded: {occ_x:.2f} > {max_x:.2f}")

        if occ_y < min_y:
            art_reasons.append(f"Subject vertical occupancy too small: {occ_y:.2f} < {min_y:.2f}")
        elif occ_y > contract.get("max_y", 1.0):
            art_reasons.append(f"Subject vertical occupancy too crowded: {occ_y:.2f} > {contract['max_y']:.2f}")

    # Orphan noise cluster count
    orphan_count = 0
    if not is_raw:
        for y in range(1, ah - 1):
            for x in range(1, aw - 1):
                if pixels[x, y][3] == 255 and all(
                    pixels[x + dx, y + dy][3] == 0
                    for dx, dy in ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1))
                ):
                    orphan_count += 1

    orphan_ratio = orphan_count / max(1, len(opaque_pixels))
    if orphan_ratio > 0.05:
        art_reasons.append(f"Excessive isolated noise pixels: {orphan_ratio:.1%}")

    # Manual or agent art review override
    if art_verdict_override:
        if art_verdict_override.get("status") == "fail":
            art_reasons.extend(art_verdict_override.get("reasons", []))
        elif art_verdict_override.get("status") == "pass":
            art_reasons.clear()

    tech_pass = len(tech_reasons) == 0
    # Shape and palette heuristics cannot grant an art-director verdict.
    if is_raw and not art_verdict_override:
        art_status = "pending"
    elif art_reasons:
        art_status = "fail"
    elif art_verdict_override and art_verdict_override.get("status") == "pass":
        art_status = "pass"
    else:
        art_status = "pending"
    prod_status = "rejected" if not tech_pass else "candidate"

    report = {
        "asset_id": asset_spec.get("id"),
        "candidate_path": str(image_path),
        "sha256": hashlib.sha256(image_path.read_bytes()).hexdigest(),
        "production_status": prod_status,
        "technical_status": {
            "value": "pass" if tech_pass else "fail",
            "reasons": tech_reasons,
        },
        "art_status": {
            "value": art_status,
            "reasons": art_reasons,
        },
        "diagnostics": diagnostics,
        "metrics": {
            "size": [w, h],
            "occupancy_x": round(occ_x, 3),
            "occupancy_y": round(occ_y, 3),
            "opaque_colors": len(unique_opaque),
            "target_range": list(target_range),
            "soft_max": soft_max,
            "alphas": alphas,
            "orphan_pixels": orphan_count,
            "orphan_ratio": round(orphan_ratio, 4),
        },
    }

    # Save report alongside candidate
    report_file = image_path.with_name(f"{image_path.stem}.review.json")
    report_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    return report
