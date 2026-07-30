from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from apps.common.error_codes import ErrorCode
from apps.common.error_messages import error_message


class DomainError(Exception):
    code = ErrorCode.BUSINESS_RULE_VIOLATION

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


class DomainValidationError(DomainError):
    pass
