"""Django ORM building blocks shared by Flowance infrastructure models."""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings
from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    """Abstract model with an application-generated UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Abstract model that records creation and last modification times."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class VersionedModel(models.Model):
    """Abstract model carrying the application-managed optimistic-lock version."""

    version = models.PositiveIntegerField(default=1, editable=False)

    def advance_version(self) -> None:
        self.version += 1

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def active(self):
        return self.filter(deleted_at__isnull=True)

    def deleted(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self) -> tuple[int, dict[str, int]]:
        count = self.active().update(deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        return super().delete()

    def restore(self) -> int:
        return self.update(deleted_at=None)


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    def get_queryset(self):
        return super().get_queryset().active()


class AllObjectsManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    pass


class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    def delete(
        self, using: str | None = None, keep_parents: bool = False
    ) -> tuple[int, dict[str, int]]:
        del keep_parents
        if self.deleted_at is not None:
            return 0, {self._meta.label: 0}
        self.deleted_at = timezone.now()
        self.save(using=using, update_fields=["deleted_at"])
        return 1, {self._meta.label: 1}

    def hard_delete(
        self, using: str | None = None, keep_parents: bool = False
    ) -> tuple[int, dict[str, int]]:
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self, using: str | None = None) -> None:
        if self.deleted_at is not None:
            self.deleted_at = None
            self.save(using=using, update_fields=["deleted_at"])

    class Meta:
        abstract = True


class OrganizationScopedQuerySet(SoftDeleteQuerySet):
    """QuerySet that makes the tenant predicate visible at every call site."""

    def for_organization(self, organization: Any):
        organization_id = getattr(organization, "pk", organization)
        if organization_id is None:
            raise ValueError("organization is required")
        return self.filter(organization_id=organization_id)


class OrganizationScopedManager(
    models.Manager.from_queryset(OrganizationScopedQuerySet)
):
    def get_queryset(self):
        return super().get_queryset().active()


class AllOrganizationObjectsManager(
    models.Manager.from_queryset(OrganizationScopedQuerySet)
):
    pass


class OrganizationScopedModel(
    UUIDModel, TimeStampedModel, VersionedModel, SoftDeleteModel
):
    """Standard base for mutable, organization-owned aggregate models.

    Repositories must start queries with ``for_organization`` and must not fetch
    an organization-owned resource by id alone.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_set",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_%(app_label)s_%(class)s_set",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_%(app_label)s_%(class)s_set",
    )

    objects = OrganizationScopedManager()
    all_objects = AllOrganizationObjectsManager()

    class Meta:
        abstract = True
