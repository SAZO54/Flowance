from __future__ import annotations

import uuid

from django.http import JsonResponse

from apps.common.error_codes import ErrorCode
from apps.common.error_messages import error_message
from apps.common.error_response import ErrorResponse


def csrf_failure(request, reason: str = "") -> JsonResponse:
    trace_id = str(getattr(request, "trace_id", uuid.uuid4()))
    body = ErrorResponse(
        code=ErrorCode.CSRF_FAILED,
        message=error_message(ErrorCode.CSRF_FAILED),
        details=(),
        trace_id=trace_id,
    )
    response = JsonResponse(body.as_dict(), status=403)
    response["X-Trace-ID"] = trace_id
    return response
