from django.conf import settings
from django.db import models

from apps.common.models import (
    AllOrganizationObjectsManager,
    OrganizationScopedManager,
    OrganizationScopedModel,
    SoftDeleteModel,
    TimeStampedModel,
    UUIDModel,
)


class ProjectStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PAUSED = "PAUSED", "Paused"
    COMPLETED = "COMPLETED", "Completed"
    ARCHIVED = "ARCHIVED", "Archived"


class ProjectIconType(models.TextChoices):
    DEFAULT = "DEFAULT", "Default"
    UPLOADED = "UPLOADED", "Uploaded"


class ProjectIconStatus(models.TextChoices):
    READY = "READY", "Ready"
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    FAILED = "FAILED", "Failed"


class Project(OrganizationScopedModel):
    client = models.ForeignKey(
        "clients.Client", on_delete=models.PROTECT, related_name="projects"
    )
    name = models.CharField(max_length=150)
    description = models.TextField(null=True, blank=True)
    label_color = models.CharField(max_length=7)
    status = models.CharField(
        max_length=20, choices=ProjectStatus.choices, default=ProjectStatus.ACTIVE
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    workload_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField(null=True, blank=True)
    icon_type = models.CharField(
        max_length=20,
        choices=ProjectIconType.choices,
        default=ProjectIconType.DEFAULT,
    )
    icon_status = models.CharField(
        max_length=20,
        choices=ProjectIconStatus.choices,
        default=ProjectIconStatus.READY,
    )
    icon_file = models.ForeignKey(
        "files.StoredFile",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="project_icons",
    )
    icon_updated_at = models.DateTimeField(null=True, blank=True)
    default_icon_text = models.CharField(max_length=4)
    default_icon_background_color = models.CharField(max_length=7)
    default_icon_text_color = models.CharField(max_length=7)

    class Meta:
        db_table = "projects"
        constraints = [
            models.UniqueConstraint(
                fields=["client", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="projects_active_client_name_uniq",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(start_date__isnull=True)
                    | models.Q(end_date__isnull=True)
                    | models.Q(start_date__lte=models.F("end_date"))
                ),
                name="projects_date_range_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(workload_rate__isnull=True)
                    | models.Q(workload_rate__gte=0, workload_rate__lte=100)
                ),
                name="projects_workload_rate_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(icon_type=ProjectIconType.DEFAULT, icon_file__isnull=True)
                    | models.Q(
                        icon_type=ProjectIconType.UPLOADED,
                        icon_file__isnull=False,
                    )
                ),
                name="projects_icon_type_file_consistent",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "status", "updated_at"],
                name="proj_org_status_updated_idx",
            ),
            models.Index(
                fields=["organization", "client", "name"],
                name="projects_org_client_name_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class ProjectMemberRole(models.TextChoices):
    MANAGER = "MANAGER", "Manager"
    MEMBER = "MEMBER", "Member"


class ProjectMember(UUIDModel, TimeStampedModel, SoftDeleteModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="project_members",
    )
    project = models.ForeignKey(
        Project, on_delete=models.PROTECT, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="project_memberships",
    )
    role = models.CharField(max_length=20, choices=ProjectMemberRole.choices)
    can_view = models.BooleanField(default=True)
    can_edit_schedule = models.BooleanField(default=False)
    can_edit_work_record = models.BooleanField(default=False)

    objects = OrganizationScopedManager()
    all_objects = AllOrganizationObjectsManager()

    class Meta:
        db_table = "project_members"
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="project_members_active_project_user_uniq",
            )
        ]
        indexes = [
            models.Index(
                fields=["organization", "project"],
                name="projmem_org_project_idx",
            ),
            models.Index(
                fields=["organization", "user"],
                name="project_members_org_user_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.project_id}:{self.user_id}:{self.role}"
