import uuid

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService
from apps.common.exceptions import FlowanceError

from ..application.service import SettlementService, get_settlement
from .serializers import SettlementCalculateSerializer, VersionSerializer


class IdempotencyKeyRequiredError(FlowanceError):
    code = "IDEMPOTENCY_KEY_REQUIRED"
    default_message = "Idempotency-KeyヘッダーをUUID形式で指定してください。"
    status_code = 400


def settlement_payload(item):
    return {
        "id": str(item.id),
        "projectId": str(item.project_id),
        "contractId": str(item.contract_id),
        "settlementMonth": item.settlement_month.strftime("%Y-%m"),
        "calculationBasis": item.calculation_basis,
        "scheduledMinutes": item.scheduled_minutes,
        "actualMinutes": item.actual_minutes,
        "billableMinutes": item.billable_minutes,
        "baseAmount": item.base_amount,
        "deductionAmount": item.deduction_amount,
        "overtimeAmount": item.overtime_amount,
        "taxAmount": item.tax_amount,
        "withholdingAmount": item.withholding_amount,
        "totalAmount": item.total_amount,
        "status": item.status,
        "finalizedAt": item.finalized_at.isoformat() if item.finalized_at else None,
        "version": item.version,
        "lines": [
            {
                "id": str(line.id),
                "type": line.line_type,
                "label": line.label,
                "amount": line.amount,
                "sortOrder": line.sort_order,
                "metadata": line.metadata,
            }
            for line in item.lines.all()
        ],
        "calculationSnapshot": item.calculation_snapshot,
    }


def _query_version(request):
    try:
        version = int(request.query_params.get("version", ""))
    except ValueError as exc:
        raise ValidationError({"version": "versionは必須です。"}) from exc
    if version < 1:
        raise ValidationError({"version": "versionは1以上で指定してください。"})
    return version


class SettlementCalculateView(APIView):
    def post(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = SettlementCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        item = SettlementService.calculate(
            membership=membership,
            project_id=values["projectId"],
            month=serializer.month(),
            basis=values["calculationBasis"],
            trace_id=request.trace_id,
        )
        response = Response(settlement_payload(item), status=status.HTTP_201_CREATED)
        response["Location"] = f"/api/v1/settlements/{item.id}"
        return response


class SettlementDetailView(APIView):
    def get(self, request, settlement_id):
        membership = AuthService.current_context(request.user).membership
        return Response(settlement_payload(get_settlement(membership, settlement_id)))

    def delete(self, request, settlement_id):
        membership = AuthService.current_context(request.user).membership
        SettlementService.delete(
            membership=membership,
            settlement_id=settlement_id,
            expected_version=_query_version(request),
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettlementRecalculateView(APIView):
    def post(self, request, settlement_id):
        membership = AuthService.current_context(request.user).membership
        serializer = VersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = SettlementService.recalculate(
            membership=membership,
            settlement_id=settlement_id,
            expected_version=serializer.validated_data["version"],
            trace_id=request.trace_id,
        )
        return Response(settlement_payload(item))


class SettlementFinalizeView(APIView):
    def post(self, request, settlement_id):
        membership = AuthService.current_context(request.user).membership
        serializer = VersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            key = uuid.UUID(request.headers.get("Idempotency-Key", ""))
        except (ValueError, AttributeError) as exc:
            raise IdempotencyKeyRequiredError() from exc
        item = SettlementService.finalize(
            membership=membership,
            settlement_id=settlement_id,
            expected_version=serializer.validated_data["version"],
            idempotency_key=key,
            trace_id=request.trace_id,
        )
        return Response(settlement_payload(item))
