from django.conf import settings
from django.db import models

from apps.common.models import OrganizationScopedModel, TimeStampedModel, UUIDModel


class CalculationBasis(models.TextChoices):
    ACTUAL = "ACTUAL", "Actual"
    SCHEDULED = "SCHEDULED", "Scheduled"


class SettlementStatus(models.TextChoices):
    CALCULATED = "CALCULATED", "Calculated"
    FINALIZED = "FINALIZED", "Finalized"


class SettlementLineType(models.TextChoices):
    BASE = "BASE", "Base"
    DEDUCTION = "DEDUCTION", "Deduction"
    OVERTIME = "OVERTIME", "Overtime"
    TAX = "TAX", "Tax"
    WITHHOLDING = "WITHHOLDING", "Withholding"


class MonthlyProjectSettlement(OrganizationScopedModel):
    project = models.ForeignKey(
        "projects.Project", on_delete=models.PROTECT, related_name="settlements"
    )
    contract = models.ForeignKey(
        "contracts.ProjectContract",
        on_delete=models.PROTECT,
        related_name="settlements",
    )
    settlement_month = models.DateField()
    calculation_basis = models.CharField(
        max_length=20, choices=CalculationBasis.choices
    )
    scheduled_minutes = models.PositiveIntegerField(default=0)
    actual_minutes = models.PositiveIntegerField(default=0)
    billable_minutes = models.PositiveIntegerField(default=0)
    base_amount = models.PositiveBigIntegerField(default=0)
    deduction_amount = models.PositiveBigIntegerField(default=0)
    overtime_amount = models.PositiveBigIntegerField(default=0)
    tax_amount = models.PositiveBigIntegerField(default=0)
    withholding_amount = models.PositiveBigIntegerField(default=0)
    total_amount = models.BigIntegerField(default=0)
    calculation_snapshot = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20,
        choices=SettlementStatus.choices,
        default=SettlementStatus.CALCULATED,
    )
    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="finalized_settlements",
    )

    class Meta:
        db_table = "monthly_project_settlements"
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "project", "settlement_month"],
                condition=models.Q(deleted_at__isnull=True),
                name="settlement_active_month_uniq",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        status=SettlementStatus.CALCULATED,
                        finalized_at__isnull=True,
                        finalized_by__isnull=True,
                    )
                    | models.Q(
                        status=SettlementStatus.FINALIZED,
                        finalized_at__isnull=False,
                        finalized_by__isnull=False,
                    )
                ),
                name="settlement_finalize_consistent",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "settlement_month", "status"],
                name="settlement_org_month_idx",
            )
        ]


class SettlementLine(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="settlement_lines",
    )
    settlement = models.ForeignKey(
        MonthlyProjectSettlement, on_delete=models.CASCADE, related_name="lines"
    )
    line_type = models.CharField(max_length=20, choices=SettlementLineType.choices)
    label = models.CharField(max_length=100)
    amount = models.PositiveBigIntegerField()
    sort_order = models.PositiveSmallIntegerField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "settlement_lines"
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["settlement", "line_type"],
                name="settlement_line_type_uniq",
            )
        ]


class IdempotencyKey(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    endpoint = models.CharField(max_length=255)
    key = models.UUIDField()
    request_hash = models.CharField(max_length=64)
    response_status = models.PositiveSmallIntegerField()
    response_body = models.JSONField()

    class Meta:
        db_table = "idempotency_keys"
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user", "endpoint", "key"],
                name="idempotency_scope_key_uniq",
            )
        ]
