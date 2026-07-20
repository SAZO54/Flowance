import uuid

from django.test import RequestFactory, SimpleTestCase
from rest_framework import exceptions

from apps.common.error_response import ErrorDetail, ErrorResponse
from apps.common.exception_handler import flowance_exception_handler
from apps.common.exceptions import ConcurrentModificationError
from apps.common.middleware import TraceIdMiddleware


class ErrorResponseTests(SimpleTestCase):
    def test_error_response_uses_api_contract_field_names(self):
        detail = ErrorDetail(
            code="REQUIRED", message="必須です。", field="name"
        ).as_dict()
        body = ErrorResponse(
            code="VALIDATION_ERROR",
            message="入力内容を確認してください。",
            details=(detail,),
            trace_id="trace-id",
        ).as_dict()

        self.assertEqual(
            set(body),
            {"code", "message", "details", "traceId"},
        )
        self.assertEqual(body["details"][0]["field"], "name")

    def test_validation_error_is_mapped_to_common_response(self):
        request = RequestFactory().get("/")
        request.trace_id = uuid.uuid4()

        response = flowance_exception_handler(
            exceptions.ValidationError({"name": ["必須です。"]}),
            {"request": request},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")
        self.assertEqual(response.data["details"][0]["field"], "name")
        self.assertEqual(response["X-Trace-ID"], str(request.trace_id))

    def test_concurrent_modification_contains_versions(self):
        error = ConcurrentModificationError(2, 3)

        self.assertEqual(error.status_code, 409)
        self.assertEqual(error.details[0]["submittedVersion"], 2)
        self.assertEqual(error.details[0]["currentVersion"], 3)


class TraceIdMiddlewareTests(SimpleTestCase):
    def test_valid_request_id_is_reused(self):
        trace_id = uuid.uuid4()
        request = RequestFactory().get("/", HTTP_X_REQUEST_ID=str(trace_id))
        middleware = TraceIdMiddleware(lambda current: self._response(current))

        response = middleware(request)

        self.assertEqual(request.trace_id, trace_id)
        self.assertEqual(response["X-Trace-ID"], str(trace_id))

    @staticmethod
    def _response(request):
        from django.http import HttpResponse

        return HttpResponse(str(request.trace_id))
