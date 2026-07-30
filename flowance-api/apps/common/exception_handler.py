from __future__ import annotations

import logging
import uuid
from typing import Any

from django.core.exceptions import (
    PermissionDenied,
    RequestDataTooBig,
    SuspiciousOperation,
)
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.common.domain.errors import DomainError
from apps.common.error_codes import ErrorCode, ValidationCode
from apps.common.error_messages import error_message, validation_message
from apps.common.error_response import ErrorResponse
from apps.common.exceptions import FlowanceError

logger = logging.getLogger(__name__)

DRF_VALIDATION_CODE_MAP = {
    "required": ValidationCode.REQUIRED,
    "blank": ValidationCode.REQUIRED,
    "null": ValidationCode.NULL_NOT_ALLOWED,
    "invalid": ValidationCode.INVALID_FORMAT,
    "invalid_choice": ValidationCode.INVALID_CHOICE,
    "max_length": ValidationCode.MAX_LENGTH,
    "min_length": ValidationCode.MIN_LENGTH,
    "min_value": ValidationCode.MIN_VALUE,
    "max_value": ValidationCode.MAX_VALUE,
    "unique": ValidationCode.DUPLICATE,
}


def _trace_id(context: dict[str, Any]) -> str:
    request = context.get("request")
    return str(getattr(request, "trace_id", uuid.uuid4()))


def _validation_details(data: Any, field: str | None = None) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        details: list[dict[str, Any]] = []
        for key, value in data.items():
            nested_field = str(key) if field is None else f"{field}.{key}"
            details.extend(_validation_details(value, nested_field))
        return details
    if isinstance(data, (list, tuple)):
        details = []
        for index, value in enumerate(data):
            indexed_field = (
                f"{field}.{index}" if field and isinstance(value, dict) else field
            )
            details.extend(_validation_details(value, indexed_field))
        return details

    raw_code = str(getattr(data, "code", "invalid"))
    code = DRF_VALIDATION_CODE_MAP.get(raw_code, raw_code.upper())
    detail: dict[str, Any] = {
        "code": code,
        "message": validation_message(code, str(data)),
    }
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

    if isinstance(exc, DomainError):
        return _response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
            trace_id=trace_id,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if isinstance(exc, FlowanceError):
        return _response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
            trace_id=trace_id,
            status_code=exc.status_code,
        )

    if isinstance(exc, RequestDataTooBig):
        return _response(
            code=ErrorCode.PAYLOAD_TOO_LARGE,
            message=error_message(ErrorCode.PAYLOAD_TOO_LARGE),
            details=[],
            trace_id=trace_id,
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    if isinstance(exc, exceptions.ValidationError):
        return _response(
            code=ErrorCode.VALIDATION_ERROR,
            message=error_message(ErrorCode.VALIDATION_ERROR),
            details=_validation_details(exc.detail),
            trace_id=trace_id,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    response = drf_exception_handler(exc, context)
    if response is not None:
        if isinstance(exc, (exceptions.NotFound, Http404)):
            code = ErrorCode.NOT_FOUND
        elif isinstance(exc, InvalidToken):
            detail = str(getattr(exc, "detail", "")).lower()
            code = (
                ErrorCode.TOKEN_EXPIRED
                if "expired" in detail
                else ErrorCode.TOKEN_INVALID
            )
        elif isinstance(
            exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)
        ):
            code = ErrorCode.UNAUTHORIZED
        elif isinstance(exc, (exceptions.PermissionDenied, PermissionDenied)):
            code = ErrorCode.FORBIDDEN
        elif isinstance(exc, exceptions.Throttled):
            code = ErrorCode.RATE_LIMITED
        elif isinstance(exc, exceptions.ParseError):
            code = ErrorCode.MALFORMED_JSON
        elif isinstance(exc, exceptions.UnsupportedMediaType):
            code = ErrorCode.UNSUPPORTED_MEDIA_TYPE
        else:
            code = ErrorCode.BAD_REQUEST
        return _response(
            code=code,
            message=error_message(code),
            details=[],
            trace_id=trace_id,
            status_code=response.status_code,
        )

    if isinstance(exc, SuspiciousOperation):
        return _response(
            code=ErrorCode.BAD_REQUEST,
            message=error_message(ErrorCode.BAD_REQUEST),
            details=[],
            trace_id=trace_id,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    logger.exception("Unhandled API exception", extra={"trace_id": trace_id})
    return _response(
        code=ErrorCode.INTERNAL_SERVER_ERROR,
        message=error_message(ErrorCode.INTERNAL_SERVER_ERROR),
        details=[],
        trace_id=trace_id,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
