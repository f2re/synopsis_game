"""Sprite-sheet row layouts for modular avatar bases.

Mirrors docs/roadmap/kn01-aaa/08_IMAGE_PROMPTS.md (AVATAR-BASE-M1 / AVATAR-BASE-M2).
One row is one animation: ``frames`` cells of the sheet's frame size, left to right.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SheetRow:
    key: str
    frames: int
    pose_prompt: str


AVATAR_BASE_SUBJECT = (
    "Neutral base character for a modular avatar system: plain grey t-shirt, dark trousers, "
    "short dark hair, adult trainee proportions, skin tones #F2C9A8 and #D9A07E, hair #2B211C."
)

AVATAR_HERO_SUBJECT = (
    "Adult trainee meteorologist as the base of a modular avatar: plain light grey t-shirt, dark navy trousers, "
    "dark sneakers, short tousled dark brown hair, warm natural skin tone, friendly attentive face with clear "
    "expressive eyes and a slight smile, average athletic build, adult proportions, natural relaxed posture."
)

SHEET_LAYOUTS: dict[str, tuple[SheetRow, ...]] = {
    "AVATAR-BASE-M1": (
        SheetRow("walk_down", 6, "walking toward the viewer, front view"),
        SheetRow("walk_up", 6, "walking away from the viewer, back view"),
        SheetRow("walk_side", 6, "walking sideways, side view facing right"),
        SheetRow("idle_side", 4, "standing idle, side view facing right"),
    ),
    "AVATAR-BASE-M2": (
        SheetRow("idle_front", 4, "standing idle, front view, relaxed arms"),
        SheetRow("walk_side", 6, "walking sideways, side view facing right"),
        SheetRow("typing_seated", 6, "seated typing at a machine seen from the side facing right, no chair"),
        SheetRow("thinking", 4, "thinking with one hand on the chin, front view"),
        SheetRow("celebrate_seated", 6, "small seated celebration, arms slightly raised, no chair"),
        SheetRow("disappointed", 4, "small seated disappointment, shoulders dropped, no chair"),
    ),
    "AVATAR-HERO-M2": (
        SheetRow("idle_front", 4, "standing idle, front view, relaxed arms"),
        SheetRow("walk_side", 6, "walking sideways, side view facing right"),
        SheetRow("typing_seated", 6, "seated typing at a machine seen from the side facing right, no chair"),
        SheetRow("thinking", 4, "thinking with one hand on the chin, front view"),
        SheetRow("celebrate_seated", 6, "small seated celebration, arms slightly raised, no chair"),
        SheetRow("disappointed", 4, "small seated disappointment, shoulders dropped, no chair"),
    ),
}


def layout_for(asset_id: str) -> tuple[SheetRow, ...]:
    """Returns the documented row layout for a sheet asset, or an empty tuple."""
    return SHEET_LAYOUTS.get(asset_id.upper(), ())
