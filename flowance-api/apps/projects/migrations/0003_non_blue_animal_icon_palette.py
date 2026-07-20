"""Replace blue default icon backgrounds with a non-blue pastel palette."""

import hashlib

from django.db import migrations

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
BLUE_PALETTE = (
    "#CFE5F0",
    "#D6EBF4",
    "#D9EAF2",
    "#DDEEF6",
    "#E5F2FA",
    "#EAF4F8",
    "#EEF7FB",
    "#F2F8FB",
)


def _backfill(model, palette):
    batch = []
    for instance in model.objects.all().iterator(chunk_size=500):
        digest = hashlib.sha256(str(instance.id).encode()).digest()
        instance.default_icon_background_color = palette[digest[1] % len(palette)]
        batch.append(instance)
        if len(batch) == 500:
            model.objects.bulk_update(batch, ("default_icon_background_color",))
            batch.clear()
    if batch:
        model.objects.bulk_update(batch, ("default_icon_background_color",))


def forwards(apps, schema_editor):
    _backfill(apps.get_model("projects", "Project"), PALETTE)


def backwards(apps, schema_editor):
    _backfill(apps.get_model("projects", "Project"), BLUE_PALETTE)


class Migration(migrations.Migration):
    dependencies = [("projects", "0002_uuid_animal_icons")]

    operations = [migrations.RunPython(forwards, backwards)]
