from django.conf import settings
from django.db import models

from apps.common.models import OrganizationScopedModel


class WeeklyScheduleStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"


class WorkScheduleStatus(models.TextChoices):
    PLANNED = "PLANNED", "Planned"
    CANCELLED = "CANCELLED", "Cancelled"


class WeeklySchedule(OrganizationScopedModel):
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.PROTECT,
        related_name="weekly_schedules",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="weekly_schedules",
    )
    day_of_week = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_minutes = models.PositiveIntegerField(default=0)
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=WeeklyScheduleStatus.choices,
        default=WeeklyScheduleStatus.ACTIVE,
    )

    class Meta:
        db_table = "project_weekly_schedules"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(day_of_week__gte=0, day_of_week__lte=6),
                name="weekly_schedules_day_range",
            ),
            models.CheckConstraint(
                condition=models.Q(start_time__lt=models.F("end_time")),
                name="weekly_schedules_time_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(valid_until__isnull=True)
                    | models.Q(valid_from__lte=models.F("valid_until"))
                ),
                name="weekly_schedules_date_range",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "project", "status"],
                name="wkly_org_proj_status_idx",
            ),
            models.Index(
                fields=["organization", "user", "day_of_week"],
                name="wkly_org_user_day_idx",
            ),
        ]


class WorkSchedule(OrganizationScopedModel):
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.PROTECT,
        related_name="work_schedules",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="work_schedules",
    )
    weekly_schedule = models.ForeignKey(
        WeeklySchedule,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="generated_work_schedules",
    )
    title = models.CharField(max_length=200)
    scheduled_start_at = models.DateTimeField()
    scheduled_end_at = models.DateTimeField()
    break_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=WorkScheduleStatus.choices,
        default=WorkScheduleStatus.PLANNED,
    )
    is_generated = models.BooleanField(default=False)
    is_manually_overridden = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "work_schedules"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(scheduled_start_at__lt=models.F("scheduled_end_at")),
                name="work_schedules_time_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_generated=False, weekly_schedule__isnull=True)
                    | models.Q(is_generated=True, weekly_schedule__isnull=False)
                ),
                name="work_schedules_source_valid",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "organization",
                    "user",
                    "scheduled_start_at",
                    "scheduled_end_at",
                ],
                name="work_org_user_time_idx",
            ),
            models.Index(
                fields=["organization", "project", "scheduled_start_at"],
                name="work_org_proj_start_idx",
            ),
            models.Index(
                fields=["weekly_schedule", "scheduled_start_at"],
                name="work_source_start_idx",
            ),
        ]
