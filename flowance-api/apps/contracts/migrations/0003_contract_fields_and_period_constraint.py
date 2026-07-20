from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateRangeField, RangeOperators
from django.contrib.postgres.operations import BtreeGistExtension
from django.db import migrations, models
from django.db.models import ExpressionWrapper, F, Func, Q, Value


def normalize_rounding_methods(apps, schema_editor):
    contract = apps.get_model("contracts", "ProjectContract")
    aliases = {
        "FLOOR": "ROUND_DOWN",
        "CEIL": "ROUND_UP",
        "ROUND": "ROUND_HALF_UP",
    }
    for previous, current in aliases.items():
        contract._base_manager.filter(rounding_method=previous).update(
            rounding_method=current
        )


def restore_rounding_methods(apps, schema_editor):
    contract = apps.get_model("contracts", "ProjectContract")
    aliases = {
        "ROUND_DOWN": "FLOOR",
        "ROUND_UP": "CEIL",
        "ROUND_HALF_UP": "ROUND",
    }
    for current, previous in aliases.items():
        contract._base_manager.filter(rounding_method=current).update(
            rounding_method=previous
        )


class Migration(migrations.Migration):
    dependencies = [
        ("contracts", "0002_alter_projectcontract_rounding_method"),
    ]

    operations = [
        BtreeGistExtension(),
        migrations.AddField(
            model_name="projectcontract",
            name="minimum_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="projectcontract",
            name="maximum_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="projectcontract",
            name="closing_day",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="projectcontract",
            name="payment_terms_days",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(
            normalize_rounding_methods,
            reverse_code=restore_rounding_methods,
        ),
        migrations.AddConstraint(
            model_name="projectcontract",
            constraint=models.CheckConstraint(
                condition=(
                    Q(closing_day__isnull=True)
                    | Q(closing_day__gte=1, closing_day__lte=31)
                ),
                name="contracts_closing_day_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="projectcontract",
            constraint=ExclusionConstraint(
                name="contracts_project_period_excl",
                expressions=[
                    ("project", RangeOperators.EQUAL),
                    (
                        Func(
                            F("valid_from"),
                            ExpressionWrapper(
                                F("valid_until") + Value(1),
                                output_field=models.DateField(),
                            ),
                            Value("[)"),
                            function="DATERANGE",
                            output_field=DateRangeField(),
                        ),
                        RangeOperators.OVERLAPS,
                    ),
                ],
                condition=Q(deleted_at__isnull=True),
            ),
        ),
    ]
