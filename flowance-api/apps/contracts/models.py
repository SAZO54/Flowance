from django.db import models

from apps.common.models import OrganizationScopedModel


class ContractType(models.TextChoices):
    HOURLY = "HOURLY", "Hourly"
    MONTHLY_RANGE = "MONTHLY_RANGE", "Monthly range"
    MONTHLY_FIXED = "MONTHLY_FIXED", "Monthly fixed"
    PERFORMANCE = "PERFORMANCE", "Performance"


class ContractStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"


class RoundingMethod(models.TextChoices):
    ROUND_DOWN = "ROUND_DOWN", "Round down"
    ROUND_UP = "ROUND_UP", "Round up"
    ROUND_HALF_UP = "ROUND_HALF_UP", "Round half up"


class ProjectContract(OrganizationScopedModel):
    project = models.ForeignKey(
        "projects.Project", on_delete=models.PROTECT, related_name="contracts"
    )
    contract_type = models.CharField(max_length=30, choices=ContractType.choices)
    currency = models.CharField(max_length=3, default="JPY")
    hourly_rate = models.PositiveBigIntegerField(null=True, blank=True)
    monthly_rate = models.PositiveBigIntegerField(null=True, blank=True)
    base_minutes = models.PositiveIntegerField(null=True, blank=True)
    deduction_rate = models.PositiveBigIntegerField(null=True, blank=True)
    overtime_rate = models.PositiveBigIntegerField(null=True, blank=True)
    performance_amount = models.PositiveBigIntegerField(null=True, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    withholding_tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    rounding_unit_minutes = models.PositiveSmallIntegerField(default=1)
    rounding_method = models.CharField(
        max_length=20, choices=RoundingMethod.choices, default=RoundingMethod.ROUND_DOWN
    )
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=ContractStatus.choices, default=ContractStatus.ACTIVE
    )

    class Meta:
        db_table = "project_contracts"
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(valid_until__isnull=True)
                    | models.Q(valid_from__lte=models.F("valid_until"))
                ),
                name="contracts_date_range_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(tax_rate__gte=0, tax_rate__lte=100),
                name="contracts_tax_rate_range",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    withholding_tax_rate__gte=0, withholding_tax_rate__lte=100
                ),
                name="contracts_withhold_range",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "project", "valid_from"],
                name="contract_org_proj_from_idx",
            )
        ]
