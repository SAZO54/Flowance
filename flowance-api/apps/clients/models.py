"""Client aggregate persistence model."""

from django.db import models

from apps.common.models import OrganizationScopedModel


class ClientStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"


class IconType(models.TextChoices):
    DEFAULT = "DEFAULT", "Default"
    UPLOADED = "UPLOADED", "Uploaded"


class IconStatus(models.TextChoices):
    READY = "READY", "Ready"
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    FAILED = "FAILED", "Failed"


class Client(OrganizationScopedModel):
    name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(max_length=254, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    postal_code = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=ClientStatus.choices, default=ClientStatus.ACTIVE
    )
    notes = models.TextField(null=True, blank=True)
    icon_type = models.CharField(
        max_length=20, choices=IconType.choices, default=IconType.DEFAULT
    )
    icon_status = models.CharField(
        max_length=20, choices=IconStatus.choices, default=IconStatus.READY
    )
    icon_file = models.ForeignKey(
        "files.StoredFile",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="client_icons",
    )
    icon_updated_at = models.DateTimeField(null=True, blank=True)
    default_icon_text = models.CharField(max_length=4)
    default_icon_background_color = models.CharField(max_length=7)
    default_icon_text_color = models.CharField(max_length=7)

    class Meta:
        db_table = "clients"
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="clients_active_org_name_uniq",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(icon_type=IconType.DEFAULT, icon_file__isnull=True)
                    | models.Q(icon_type=IconType.UPLOADED, icon_file__isnull=False)
                ),
                name="clients_icon_type_file_consistent",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "status", "updated_at"],
                name="clients_org_status_updated_idx",
            ),
            models.Index(
                fields=["organization", "name"],
                name="clients_org_name_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.name
