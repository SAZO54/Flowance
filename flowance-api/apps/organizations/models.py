"""Organization aggregate persistence models."""

from django.db import models

from apps.common.models import (
    SoftDeleteModel,
    TimeStampedModel,
    UUIDModel,
    VersionedModel,
)


class OrganizationStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    DELETED = "DELETED", "Deleted"


class Organization(UUIDModel, TimeStampedModel, VersionedModel, SoftDeleteModel):
    name = models.CharField(max_length=150)
    owner_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="owned_organizations",
    )
    currency = models.CharField(max_length=3, default="JPY")
    timezone = models.CharField(max_length=64, default="Asia/Tokyo")
    status = models.CharField(
        max_length=20,
        choices=OrganizationStatus.choices,
        default=OrganizationStatus.ACTIVE,
    )

    class Meta:
        db_table = "organizations"
        indexes = [models.Index(fields=["status"], name="organizations_status_idx")]

    def __str__(self) -> str:
        return self.name


class OrganizationRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    MEMBER = "MEMBER", "Member"


class OrganizationMemberStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INVITED = "INVITED", "Invited"
    SUSPENDED = "SUSPENDED", "Suspended"


class OrganizationMember(UUIDModel, TimeStampedModel, SoftDeleteModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="organization_memberships",
    )
    role = models.CharField(max_length=20, choices=OrganizationRole.choices)
    status = models.CharField(
        max_length=20,
        choices=OrganizationMemberStatus.choices,
        default=OrganizationMemberStatus.ACTIVE,
    )
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "organization_members"
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="organization_members_active_org_user_uniq",
            )
        ]
        indexes = [
            models.Index(
                fields=["organization", "status"],
                name="org_members_org_status_idx",
            )
        ]

    def __str__(self) -> str:
        return f"{self.organization_id}:{self.user_id}:{self.role}"
