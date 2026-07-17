"""Framework-independent default icon generation."""

import hashlib
import re
import unicodedata
from dataclasses import dataclass
from uuid import UUID

PALETTE = (
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#DC2626",
    "#EA580C",
    "#059669",
    "#0891B2",
    "#4F46E5",
)


@dataclass(frozen=True, slots=True)
class DefaultIcon:
    text: str
    background_color: str
    text_color: str


def icon_text(name: str) -> str:
    cleaned = "".join(
        character
        for character in name.strip()
        if not unicodedata.category(character).startswith(("C", "Z"))
    )
    words = re.findall(r"[A-Za-z0-9]+", name)
    if len(words) >= 2:
        return "".join(word[0].upper() for word in words[:2])
    if words and cleaned.isascii():
        return words[0][0].upper()
    return cleaned[:1] or "?"


def generate_default_icon(name: str, stable_id: UUID) -> DefaultIcon:
    digest = hashlib.sha256(str(stable_id).encode()).digest()
    background = PALETTE[digest[0] % len(PALETTE)]
    red, green, blue = (
        int(background[1:3], 16),
        int(background[3:5], 16),
        int(background[5:7], 16),
    )
    luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    text_color = "#111827" if luminance > 0.62 else "#FFFFFF"
    return DefaultIcon(icon_text(name), background, text_color)
