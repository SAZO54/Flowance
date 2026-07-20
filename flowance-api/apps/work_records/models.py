from django.conf import settings
from django.db import models

from apps.common.models import (
    OrganizationScopedModel,
    TimeStampedModel,
    UUIDModel,
)


class WorkRecordStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"


class WorkRecord(OrganizationScopedModel):
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.PROTECT,
        related_name="work_records",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="work_records",
    )
    work_schedule = models.ForeignKey(
        "schedules.WorkSchedule",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="work_records",
    )
    actual_start_at = models.DateTimeField()
    actual_end_at = models.DateTimeField()
    actual_minutes = models.PositiveIntegerField()
    break_minutes = models.PositiveIntegerField(default=0)
    billable_minutes = models.PositiveIntegerField()
    is_billable = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=WorkRecordStatus.choices,
        default=WorkRecordStatus.DRAFT,
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "work_records"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(actual_start_at__lt=models.F("actual_end_at")),
                name="work_records_time_range",
            ),
            models.CheckConstraint(
                condition=(models.Q(is_billable=True) | models.Q(billable_minutes=0)),
                name="work_records_nonbillable_zero",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "user", "actual_start_at"],
                name="work_org_user_start_idx",
            ),
            models.Index(
                fields=["organization", "project", "actual_start_at"],
                name="record_org_proj_start_idx",
            ),
            models.Index(
                fields=["organization", "status", "actual_start_at"],
                name="work_org_status_start_idx",
            ),
        ]


class WorkRecordBreak(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="work_record_breaks",
    )
    work_record = models.ForeignKey(
        WorkRecord,
        on_delete=models.CASCADE,
        related_name="breaks",
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    break_minutes = models.PositiveIntegerField()
    sort_order = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "work_breaks"
        ordering = ["sort_order", "start_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_at__lt=models.F("end_at")),
                name="work_breaks_time_range",
            ),
            models.UniqueConstraint(
                fields=["work_record", "sort_order"],
                name="work_breaks_record_order_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "work_record"],
                name="work_break_org_record_idx",
            )
        ]
