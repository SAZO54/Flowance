from __future__ import annotations

import uuid


class TraceIdMiddleware:
    header_name = "HTTP_X_REQUEST_ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.trace_id = self._trace_id(request.META.get(self.header_name))
        response = self.get_response(request)
        response["X-Trace-ID"] = str(request.trace_id)
        return response

    @staticmethod
    def _trace_id(candidate: str | None) -> uuid.UUID:
        if candidate:
            try:
                return uuid.UUID(candidate)
            except (ValueError, AttributeError):
                pass
        return uuid.uuid4()
