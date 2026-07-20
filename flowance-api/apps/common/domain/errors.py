from __future__ import annotations

from collections.abc import Sequence
from typing import Any


class DomainError(Exception):
    code = "BUSINESS_RULE_VIOLATION"
    default_message = "業務ルールにより処理できません。"

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


class DomainValidationError(DomainError):
    pass
