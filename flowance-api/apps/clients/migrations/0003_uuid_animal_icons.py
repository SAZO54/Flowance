"""Backfill UUID-based animal icons."""

import hashlib
import re
import unicodedata

from django.db import migrations

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
    "#CFE5F0",
    "#D6EBF4",
    "#D9EAF2",
    "#DDEEF6",
    "#E5F2FA",
    "#EAF4F8",
    "#EEF7FB",
    "#F2F8FB",
)
LEGACY_PALETTE = (
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#DC2626",
    "#EA580C",
    "#059669",
    "#0891B2",
    "#4F46E5",
)
TEXT_COLOR = "#294B5B"
FIELDS = (
    "default_icon_text",
    "default_icon_background_color",
    "default_icon_text_color",
)


def _animal_values(stable_id):
    digest = hashlib.sha256(str(stable_id).encode()).digest()
    return (
        ANIMALS[digest[0] % len(ANIMALS)],
        PALETTE[digest[1] % len(PALETTE)],
        TEXT_COLOR,
    )


def _legacy_text(name):
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


def _legacy_values(name, stable_id):
    digest = hashlib.sha256(str(stable_id).encode()).digest()
    background = LEGACY_PALETTE[digest[0] % len(LEGACY_PALETTE)]
    red, green, blue = (
        int(background[1:3], 16),
        int(background[3:5], 16),
        int(background[5:7], 16),
    )
    luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    text_color = "#111827" if luminance > 0.62 else "#FFFFFF"
    return _legacy_text(name), background, text_color


def _backfill(model, value_factory):
    batch = []
    for instance in model.objects.all().iterator(chunk_size=500):
        values = value_factory(instance)
        for field, value in zip(FIELDS, values, strict=True):
            setattr(instance, field, value)
        batch.append(instance)
        if len(batch) == 500:
            model.objects.bulk_update(batch, FIELDS)
            batch.clear()
    if batch:
        model.objects.bulk_update(batch, FIELDS)


def forwards(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    _backfill(Client, lambda client: _animal_values(client.id))


def backwards(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    _backfill(Client, lambda client: _legacy_values(client.name, client.id))


class Migration(migrations.Migration):
    dependencies = [("clients", "0002_initial")]

    operations = [migrations.RunPython(forwards, backwards)]
