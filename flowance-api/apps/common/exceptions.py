from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from apps.common.error_codes import ErrorCode, ValidationCode
from apps.common.error_messages import error_message, validation_message


class FlowanceError(Exception):
    code = ErrorCode.BUSINESS_RULE_VIOLATION
    status_code = 422

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: Sequence[dict[str, Any]] | None = None,
    ) -> None:
        self.code = code or self.code
        self.message = message or error_message(self.code)
        self.details = list(details or [])
        super().__init__(self.message)


class AuthenticationError(FlowanceError):
    code = ErrorCode.UNAUTHORIZED
    status_code = 401


class AuthorizationError(FlowanceError):
    code = ErrorCode.FORBIDDEN
    status_code = 403


class CsrfFailedError(FlowanceError):
    code = ErrorCode.CSRF_FAILED
    status_code = 403


class ResourceNotFoundError(FlowanceError):
    code = ErrorCode.NOT_FOUND
    status_code = 404


class ConflictError(FlowanceError):
    code = ErrorCode.CONFLICT
    status_code = 409


class ConcurrentModificationError(ConflictError):
    code = ErrorCode.CONCURRENT_MODIFICATION

    def __init__(self, submitted_version: int, current_version: int) -> None:
        super().__init__(
            details=[
                {
                    "field": "version",
                    "code": ValidationCode.VERSION_MISMATCH,
                    "message": validation_message(ValidationCode.VERSION_MISMATCH),
                    "submittedVersion": submitted_version,
                    "currentVersion": current_version,
                }
            ]
        )


class InfrastructureError(FlowanceError):
    code = ErrorCode.SERVICE_UNAVAILABLE
    status_code = 503


class AuditLogImmutableError(ConflictError):
    code = ErrorCode.AUDIT_LOG_IMMUTABLE
