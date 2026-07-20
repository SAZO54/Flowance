from __future__ import annotations

import uuid
from collections.abc import Mapping
from typing import Any

from django.db import transaction

from .models import AuditLog

SENSITIVE_KEYS = {
    "access_token",
    "authorization",
    "cookie",
    "password",
    "refresh_token",
    "secret",
    "token",
}


def _redact(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            str(key): "[REDACTED]"
            if str(key).lower() in SENSITIVE_KEYS
            else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_redact(item) for item in value]
    return value


class AuditLogService:
    @staticmethod
    @transaction.atomic
    def record(
        *,
        action: str,
        resource_type: str,
        organization=None,
        actor_user=None,
        resource_id: uuid.UUID | None = None,
        before: Mapping[str, Any] | None = None,
        after: Mapping[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        trace_id: uuid.UUID | None = None,
    ) -> AuditLog:
        return AuditLog.objects.create(
            organization=organization,
            actor_user=actor_user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            before=_redact(before) if before is not None else None,
            after=_redact(after) if after is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
            trace_id=trace_id,
        )

    @classmethod
    def record_from_request(cls, *, request, **kwargs: Any) -> AuditLog:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        ip_address = forwarded_for.split(",", 1)[0].strip() or request.META.get(
            "REMOTE_ADDR"
        )
        return cls.record(
            actor_user=request.user
            if getattr(request.user, "is_authenticated", False)
            else None,
            ip_address=ip_address,
            user_agent=request.META.get("HTTP_USER_AGENT"),
            trace_id=getattr(request, "trace_id", None),
            **kwargs,
        )
