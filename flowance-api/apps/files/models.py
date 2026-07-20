from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from apps.common.models import (
    AllOrganizationObjectsManager,
    OrganizationScopedManager,
    SoftDeleteModel,
    TimeStampedModel,
    UUIDModel,
)


class FileCategory(models.TextChoices):
    CLIENT_ICON = "CLIENT_ICON", "Client icon"
    PROJECT_ICON = "PROJECT_ICON", "Project icon"
    TEMPORARY = "TEMPORARY", "Temporary"


class FileStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    READY = "READY", "Ready"
    FAILED = "FAILED", "Failed"
    DELETED = "DELETED", "Deleted"


class StorageProvider(models.TextChoices):
    LOCAL = "LOCAL", "Local"
    CLOUDFLARE_R2 = "CLOUDFLARE_R2", "Cloudflare R2"


class StoredFile(UUIDModel, TimeStampedModel, SoftDeleteModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="stored_files",
    )
    category = models.CharField(max_length=30, choices=FileCategory.choices)
    status = models.CharField(
        max_length=20, choices=FileStatus.choices, default=FileStatus.PENDING
    )
    storage_provider = models.CharField(
        max_length=30, choices=StorageProvider.choices, default=StorageProvider.LOCAL
    )
    bucket_name = models.CharField(max_length=255, null=True, blank=True)
    original_object_key = models.CharField(max_length=1024, null=True, blank=True)
    processed_object_key = models.CharField(max_length=1024, null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    content_type = models.CharField(max_length=100, null=True, blank=True)
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    checksum_sha256 = models.CharField(max_length=64, null=True, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    variants = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_files",
    )

    objects = OrganizationScopedManager()
    all_objects = AllOrganizationObjectsManager()

    class Meta:
        db_table = "stored_files"
        indexes = [
            models.Index(
                fields=["organization", "category", "status"],
                name="stored_org_cat_status_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(file_size_bytes__gte=0)
                | models.Q(file_size_bytes__isnull=True),
                name="stored_files_size_nonnegative",
            )
        ]


class BackgroundTaskType(models.TextChoices):
    IMAGE_PROCESSING = "IMAGE_PROCESSING", "Image processing"
    FILE_DELETE = "FILE_DELETE", "File delete"
    OUTBOX_DISPATCH = "OUTBOX_DISPATCH", "Outbox dispatch"
    CLEANUP = "CLEANUP", "Cleanup"


class BackgroundTaskStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class BackgroundTask(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="background_tasks",
    )
    task_type = models.CharField(max_length=100, choices=BackgroundTaskType.choices)
    resource_type = models.CharField(max_length=100, null=True, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=BackgroundTaskStatus.choices,
        default=BackgroundTaskStatus.PENDING,
    )
    progress = models.PositiveSmallIntegerField(default=0)
    result = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "background_tasks"
        indexes = [
            models.Index(
                fields=["organization", "status", "created_at"],
                name="bgtask_org_status_created_idx",
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(progress__gte=0, progress__lte=100),
                name="background_tasks_progress_range",
            )
        ]
