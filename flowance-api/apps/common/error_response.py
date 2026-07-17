"""Common API error response value objects."""

from __future__ import annotations

from dataclasses import dataclass, field as dataclass_field
from typing import Any


@dataclass(frozen=True, slots=True)
class ErrorDetail:
    code: str
    message: str
    field: str | None = None
    context: dict[str, Any] = dataclass_field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.field is not None:
            result["field"] = self.field
        result.update(self.context)
        return result


@dataclass(frozen=True, slots=True)
class ErrorResponse:
    code: str
    message: str
    trace_id: str
    details: tuple[dict[str, Any], ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "details": list(self.details),
            "traceId": self.trace_id,
        }
