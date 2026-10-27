from __future__ import annotations

from typing import Any

CLASS_ARCHITECTURE = "architecture"
CLASS_PORTRAIT = "portrait"
CLASS_CHARACTER_SPRITE = "character_sprite"
CLASS_PROP = "prop"
CLASS_TERRAIN = "terrain"
CLASS_VEGETATION = "vegetation"
CLASS_UI = "ui"

OCCUPANCY_CONTRACTS = {
    CLASS_ARCHITECTURE: {
        "min_x": 0.60,
        "max_x": 0.90,
        "min_y": 0.55,
        "max_y": 0.90,
    },
    CLASS_PORTRAIT: {
        "min_x": 0.65,
        "max_x": 0.95,
        "min_y": 0.80,
        "max_y": 0.98,
        "head_height_ratio": (0.40, 0.58),
        "eye_line_y": (0.35, 0.50),
    },
    CLASS_PROP: {
        "min_x": 0.50,
        "max_x": 0.85,
        "min_y": 0.50,
        "max_y": 0.85,
    },
    CLASS_CHARACTER_SPRITE: {
        "min_x": 0.40,
        "max_x": 0.80,
        "min_y": 0.70,
        "max_y": 0.95,
    },
    CLASS_TERRAIN: {
        "min_x": 0.95,
        "max_x": 1.00,
        "min_y": 0.95,
        "max_y": 1.00,
    },
    CLASS_VEGETATION: {
        "min_x": 0.50,
        "max_x": 0.90,
        "min_y": 0.60,
        "max_y": 0.95,
    },
    CLASS_UI: {
        "min_x": 0.40,
        "max_x": 0.95,
        "min_y": 0.40,
        "max_y": 0.95,
    },
}

PALETTE_ROLE_MAP = {
    CLASS_ARCHITECTURE: "architecture",
    CLASS_PORTRAIT: "people",
    CLASS_CHARACTER_SPRITE: "people",
    CLASS_PROP: "props",
    CLASS_TERRAIN: "terrain",
    CLASS_VEGETATION: "environment",
    CLASS_UI: "ui",
}

PALETTE_CONTRACTS = {
    CLASS_PORTRAIT: {
        "role": "people",
        "target_range": (24, 40),
        "hard_max": 48,
        "strict_family": True,
    },
    CLASS_CHARACTER_SPRITE: {
        "role": "people",
        "target_range": (16, 28),
        "hard_max": 32,
        "strict_family": True,
    },
    CLASS_ARCHITECTURE: {
        "role": "architecture",
        "target_range": (32, 56),
        "hard_max": 64,
        "strict_family": True,
    },
    CLASS_PROP: {
        "role": "props",
        "target_range": (12, 24),
        "hard_max": 32,
        "strict_family": True,
    },
    CLASS_TERRAIN: {
        "role": "terrain",
        "target_range": (16, 32),
        "hard_max": 40,
        "strict_family": True,
    },
    CLASS_VEGETATION: {
        "role": "environment",
        "target_range": (16, 32),
        "hard_max": 40,
        "strict_family": True,
    },
    CLASS_UI: {
        "role": "ui",
        "target_range": (8, 16),
        "hard_max": 20,
        "strict_family": True,
    },
}


def classify_asset(asset_id: str, asset_spec: dict[str, Any] | None = None) -> str:
    """Classifies an asset into its target class based on ID and metadata."""
    aid = asset_id.upper()
    spec = asset_spec or {}

    if spec.get("class"):
        return spec["class"]

    if spec.get("people") or "PORTRAIT" in aid or "MENTOR" in aid or "AVATAR" in aid or "CHAR" in aid:
        if spec.get("frame") and (spec.get("size", [0, 0])[0] > 100 or "SHEET" in aid or "WALK" in aid):
            return CLASS_CHARACTER_SPRITE
        if "PORTRAIT" in aid or "MENTOR" in aid or spec.get("size") in ([64, 64], [128, 128], [96, 96]):
            return CLASS_PORTRAIT
        return CLASS_CHARACTER_SPRITE

    if aid.startswith("BLD-") or "BUILDING" in aid or "FACADE" in aid or "RADAR" in aid:
        return CLASS_ARCHITECTURE

    if aid.startswith("PROP-") or "PROPS" in aid or "FURNITURE" in aid or "ITEM" in aid:
        return CLASS_PROP

    if aid.startswith("KF-") or aid.startswith("HUB-GROUND") or "TILE" in aid or "TERRAIN" in aid:
        return CLASS_TERRAIN

    if "VEGETATION" in aid or "TREE" in aid or "BUSH" in aid:
        return CLASS_VEGETATION

    if aid.startswith("UI-") or "ICON" in aid or "FRAME" in aid or "BADGE" in aid:
        return CLASS_UI

    return CLASS_PROP
