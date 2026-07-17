"""DRF exception handler producing the Flowance ErrorResponse contract."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .error_response import ErrorResponse
from .exceptions import FlowanceError

logger = logging.getLogger(__name__)


def _trace_id(context: dict[str, Any]) -> str:
    request = context.get("request")
    return str(getattr(request, "trace_id", uuid.uuid4()))


def _validation_details(data: Any, field: str | None = None) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        details: list[dict[str, Any]] = []
        for key, value in data.items():
            details.extend(_validation_details(value, str(key)))
        return details
    if isinstance(data, (list, tuple)):
        details = []
        for value in data:
            details.extend(_validation_details(value, field))
        return details

    code = getattr(data, "code", "INVALID")
    detail: dict[str, Any] = {"code": str(code).upper(), "message": str(data)}
    if field and field != "non_field_errors":
        detail["field"] = field
    return [detail]


def _response(
    *,
    code: str,
    message: str,
    details: list[dict[str, Any]],
    trace_id: str,
    status_code: int,
) -> Response:
    body = ErrorResponse(
        code=code, message=message, details=tuple(details), trace_id=trace_id
    )
    response = Response(body.as_dict(), status=status_code)
    response["X-Trace-ID"] = trace_id
    return response


def flowance_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    trace_id = _trace_id(context)

    if isinstance(exc, FlowanceError):
        return _response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
            trace_id=trace_id,
            status_code=exc.status_code,
        )

    if isinstance(exc, exceptions.ValidationError):
        return _response(
            code="VALIDATION_ERROR",
            message="入力内容を確認してください。",
            details=_validation_details(exc.detail),
            trace_id=trace_id,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    response = drf_exception_handler(exc, context)
    if response is not None:
        if isinstance(exc, (exceptions.NotFound, Http404)):
            code, message = "NOT_FOUND", "対象のリソースが見つかりません。"
        elif isinstance(
            exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)
        ):
            code, message = "UNAUTHORIZED", "認証が必要です。"
        elif isinstance(exc, (exceptions.PermissionDenied, PermissionDenied)):
            code, message = "FORBIDDEN", "この操作を実行する権限がありません。"
        elif isinstance(exc, exceptions.Throttled):
            code, message = "RATE_LIMITED", "リクエスト回数が上限を超えました。"
        else:
            code, message = "BAD_REQUEST", "リクエストを処理できません。"
        return _response(
            code=code,
            message=message,
            details=[],
            trace_id=trace_id,
            status_code=response.status_code,
        )

    logger.exception("Unhandled API exception", extra={"trace_id": trace_id})
    return _response(
        code="INTERNAL_SERVER_ERROR",
        message="予期しないエラーが発生しました。",
        details=[],
        trace_id=trace_id,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
