"""Append-only audit log persistence model."""

from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from apps.common.exceptions import AuditLogImmutableError
from apps.common.models import UUIDModel


class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs: Any) -> int:
        raise AuditLogImmutableError()

    def delete(self) -> tuple[int, dict[str, int]]:
        raise AuditLogImmutableError()

    def bulk_update(self, objs: Any, fields: Any, batch_size: int | None = None) -> int:
        raise AuditLogImmutableError()


class AuditLogManager(models.Manager.from_queryset(AuditLogQuerySet)):
    pass


class AuditLog(UUIDModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.UUIDField(null=True, blank=True)
    before = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    after = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    trace_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AuditLogManager()

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(
                fields=["organization", "-created_at"],
                name="audit_logs_org_created_idx",
            ),
            models.Index(fields=["trace_id"], name="audit_logs_trace_idx"),
            models.Index(
                fields=["resource_type", "resource_id"],
                name="audit_logs_resource_idx",
            ),
        ]
        ordering = ["-created_at"]

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self._state.adding:
            raise AuditLogImmutableError()
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> None:
        raise AuditLogImmutableError()

    def __str__(self) -> str:
        return f"{self.action}:{self.resource_type}:{self.resource_id or '-'}"
