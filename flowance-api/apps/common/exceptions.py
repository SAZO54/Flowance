"""Framework-independent exceptions shared by domain and application layers."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any


class FlowanceError(Exception):
    code = "BUSINESS_RULE_VIOLATION"
    default_message = "業務ルールにより処理できません。"
    status_code = 422

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: Sequence[dict[str, Any]] | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.code = code or self.code
        self.details = list(details or [])
        super().__init__(self.message)


class AuthenticationError(FlowanceError):
    code = "UNAUTHORIZED"
    default_message = "認証が必要です。"
    status_code = 401


class AuthorizationError(FlowanceError):
    code = "FORBIDDEN"
    default_message = "この操作を実行する権限がありません。"
    status_code = 403


class CsrfFailedError(FlowanceError):
    code = "CSRF_FAILED"
    default_message = "CSRF検証に失敗しました。"
    status_code = 403


class ResourceNotFoundError(FlowanceError):
    code = "NOT_FOUND"
    default_message = "対象のリソースが見つかりません。"
    status_code = 404


class ConflictError(FlowanceError):
    code = "CONFLICT"
    default_message = "現在の状態と競合したため処理できません。"
    status_code = 409


class ConcurrentModificationError(ConflictError):
    code = "CONCURRENT_MODIFICATION"
    default_message = "他の操作によりデータが更新されています。"

    def __init__(self, submitted_version: int, current_version: int) -> None:
        super().__init__(
            details=[
                {
                    "field": "version",
                    "code": "VERSION_MISMATCH",
                    "message": "最新の内容を取得し直してください。",
                    "submittedVersion": submitted_version,
                    "currentVersion": current_version,
                }
            ]
        )


class DomainValidationError(FlowanceError):
    pass


class InfrastructureError(FlowanceError):
    code = "SERVICE_UNAVAILABLE"
    default_message = "一時的にサービスを利用できません。"
    status_code = 503


class AuditLogImmutableError(ConflictError):
    code = "AUDIT_LOG_IMMUTABLE"
    default_message = "監査ログは変更または削除できません。"
