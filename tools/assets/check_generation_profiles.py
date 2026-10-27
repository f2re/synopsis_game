#!/usr/bin/env python3
"""Regression checks for art generation profiles.

The purpose is to prevent the pipeline from silently collapsing expressive portraits
back to tiny sprite-like targets or destructive palette/downsampling rules.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "art-generation-profiles.json"


def main() -> int:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    profiles = data.get("profiles", {})
    errors: list[str] = []

    required = {
        "dialogue_portrait",
        "profile_portrait",
        "world_character",
        "architecture_landmark",
        "large_scene",
    }
    missing = sorted(required - set(profiles))
    if missing:
        errors.append(f"missing generation profiles: {', '.join(missing)}")

    portrait = profiles.get("dialogue_portrait", {})
    psize = portrait.get("sourceLogicalSize", {})
    if psize.get("width", 0) < 192 or psize.get("height", 0) < 240:
        errors.append("dialogue_portrait must remain at least 192x240 logical pixels")

    palette = portrait.get("palette", {})
    target = palette.get("targetColors", [0, 0])
    if not isinstance(target, list) or len(target) != 2 or target[0] < 48 or target[1] < 64:
        errors.append("dialogue_portrait palette must preserve high-detail color ramps (>=48 target colors)")
    if palette.get("strictQuantization") is not False:
        errors.append("dialogue_portrait must not use strict palette quantization")

    pixel = portrait.get("pixelLanguage", {})
    if pixel.get("clusterScale") != "fine":
        errors.append("dialogue_portrait must use fine pixel clusters")
    if pixel.get("majorityDownsample") is not False:
        errors.append("dialogue_portrait majority downsampling is forbidden")
    if pixel.get("singlePixelFacialDetailAllowed") is not True:
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

    for name, profile in profiles.items():
        px = profile.get("pixelLanguage", {})
        if px.get("majorityDownsample") is True:
            errors.append(f"{name}: majorityDownsample=true is forbidden")

    if errors:
        print("Generation profile regression check: FAIL")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Generation profile regression check: PASS")
    print("Dialogue portraits remain high-detail and separate from world sprites.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
