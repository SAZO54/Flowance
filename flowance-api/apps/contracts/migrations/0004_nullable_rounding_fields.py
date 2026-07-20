from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("contracts", "0003_contract_fields_and_period_constraint"),
    ]

    operations = [
        migrations.AlterField(
            model_name="projectcontract",
            name="rounding_unit_minutes",
            field=models.PositiveSmallIntegerField(
                blank=True,
                default=1,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="projectcontract",
            name="rounding_method",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ROUND_DOWN", "Round down"),
                    ("ROUND_UP", "Round up"),
                    ("ROUND_HALF_UP", "Round half up"),
                ],
                default="ROUND_DOWN",
                max_length=20,
                null=True,
            ),
        ),
    ]
