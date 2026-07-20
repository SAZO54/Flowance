import hashlib
from dataclasses import dataclass
from uuid import UUID

ANIMALS = (
    "🐶",
    "🐱",
    "🐰",
    "🐻",
    "🐼",
    "🐨",
    "🦊",
    "🐯",
    "🦁",
    "🐸",
    "🐵",
    "🐧",
    "🐦",
    "🐙",
    "🐳",
    "🐢",
)

PALETTE = (
    "#F7D9C4",
    "#F4C7C3",
    "#E8D5F2",
    "#F6E3A1",
    "#DDE5B6",
    "#E7D7C9",
    "#F2CEDA",
    "#DCCFBF",
)

TEXT_COLOR = "#294B5B"


@dataclass(frozen=True, slots=True)
class DefaultIcon:
    text: str
    background_color: str
    text_color: str


def generate_default_icon(stable_id: UUID) -> DefaultIcon:
    digest = hashlib.sha256(str(stable_id).encode()).digest()
    return DefaultIcon(
        text=ANIMALS[digest[0] % len(ANIMALS)],
        background_color=PALETTE[digest[1] % len(PALETTE)],
        text_color=TEXT_COLOR,
    )
