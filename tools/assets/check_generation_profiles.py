#!/usr/bin/env python3
"""Regression checks for art generation profiles.

The checker protects the production architecture from collapsing distinct art
classes into one destructive pixel-normalization pipeline. It intentionally
checks contracts, not subjective beauty.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "art-generation-profiles.json"

REQUIRED_PROFILES = {
    "dialogue_portrait",
    "profile_portrait",
    "world_character",
    "companion_sprite",
    "architecture_landmark",
    "architecture_small",
    "interactive_object",
    "prop_sprite",
    "terrain_tile",
    "vegetation_sprite",
    "ui_icon",
    "ui_frame",
    "vfx_small",
    "large_scene",
}

MIN_TARGET_COLORS = {
    "dialogue_portrait": 48,
    "profile_portrait": 36,
    "world_character": 24,
    "companion_sprite": 24,
    "architecture_landmark": 48,
    "architecture_small": 32,
    "interactive_object": 28,
    "prop_sprite": 24,
    "terrain_tile": 24,
    "vegetation_sprite": 28,
    "ui_icon": 12,
    "ui_frame": 24,
    "vfx_small": 16,
    "large_scene": 96,
}


def main() -> int:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    profiles = data.get("profiles", {})
    errors: list[str] = []

    missing = sorted(REQUIRED_PROFILES - set(profiles))
    if missing:
        errors.append(f"missing generation profiles: {', '.join(missing)}")

    policy = data.get("policy", {})
    if policy.get("globalMajorityDownsample") is not False:
        errors.append("global majority downsampling must remain disabled")
    if policy.get("universalWorkflowForbidden") is not True:
        errors.append("one universal art workflow must remain forbidden")
    if policy.get("technicalPassIsArtPass") is not False:
        errors.append("technical pass must never imply art acceptance")
    if policy.get("colorCountIsDiagnosticNotQualityScore") is not True:
        errors.append("color count must remain diagnostic, not a quality score")

    portrait = profiles.get("dialogue_portrait", {})
    psize = portrait.get("sourceLogicalSize", {})
    if psize.get("width", 0) < 192 or psize.get("height", 0) < 240:
        errors.append("dialogue_portrait must remain at least 192x240 logical pixels")

    ppalette = portrait.get("palette", {})
    ptarget = ppalette.get("targetColors", [0, 0])
    if not isinstance(ptarget, list) or len(ptarget) != 2 or ptarget[0] < 48 or ptarget[1] < 64:
        errors.append("dialogue_portrait must preserve rich color ramps")
    if ppalette.get("strictQuantization") is not False:
        errors.append("dialogue_portrait must not use strict palette quantization")

    ppixel = portrait.get("pixelLanguage", {})
    if ppixel.get("clusterScale") != "fine":
        errors.append("dialogue_portrait must use fine pixel clusters")
    if ppixel.get("singlePixelFacialDetailAllowed") is not True:
        errors.append("dialogue_portrait must allow fine facial details")

    comp = portrait.get("composition", {})
    if comp.get("faceWidthPixelsMinimum", 0) < 80:
        errors.append("dialogue_portrait face must remain large enough for expressive features")
    if comp.get("expressionPriority") != "high":
        errors.append("dialogue_portrait must prioritize facial expression")

    world = profiles.get("world_character", {})
    wsize = world.get("sourceLogicalSize", {})
    if wsize != {"width": 32, "height": 48}:
        errors.append("world_character must remain a separate 32x48 gameplay sprite profile")
    if world.get("workflow") == portrait.get("workflow"):
        errors.append("dialogue portrait and world sprite must never share one workflow")

    scene = profiles.get("large_scene", {})
    ssize = scene.get("sourceLogicalSize", {})
    if ssize != {"width": 480, "height": 270}:
        errors.append("large_scene must preserve the canonical 480x270 logical canvas")

    workflows: dict[str, str] = {}
    for name, profile in profiles.items():
        workflow = profile.get("workflow")
        if not isinstance(workflow, str) or not workflow:
            errors.append(f"{name}: workflow must be a non-empty string")
        elif workflow in workflows:
            errors.append(f"{name}: workflow duplicates {workflows[workflow]} ({workflow})")
        else:
            workflows[workflow] = name

        palette = profile.get("palette", {})
        target = palette.get("targetColors")
        if not isinstance(target, list) or len(target) != 2:
            errors.append(f"{name}: targetColors must contain [min, max]")
        else:
            low, high = target
            expected_min = MIN_TARGET_COLORS.get(name, 0)
            if not isinstance(low, int) or not isinstance(high, int) or low <= 0 or high < low:
                errors.append(f"{name}: invalid target color range {target!r}")
            elif low < expected_min:
                errors.append(f"{name}: target palette collapsed below class minimum {expected_min}")

        if palette.get("strictQuantization") is True:
            errors.append(f"{name}: strictQuantization=true is forbidden in generation profiles")

        px = profile.get("pixelLanguage", {})
        if px.get("majorityDownsample") is not False:
            errors.append(f"{name}: majorityDownsample must be false")

        priorities = profile.get("artPriorities")
        if not isinstance(priorities, list) or not priorities:
            errors.append(f"{name}: artPriorities must describe the class-specific visual goal")

    if errors:
        print("Generation profile regression check: FAIL")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Generation profile regression check: PASS")
    print(f"Protected {len(REQUIRED_PROFILES)} distinct art classes from destructive normalization regressions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
