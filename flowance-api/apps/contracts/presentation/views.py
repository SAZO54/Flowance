from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService

from ..application.services import ContractService, get_contract, list_contracts
from .serializers import ContractUpdateSerializer, ContractWriteSerializer


def _is_current(contract, organization) -> bool:
    today = timezone.now().astimezone(ZoneInfo(organization.timezone)).date()
    return (
        contract.status == "ACTIVE"
        and contract.valid_from <= today
        and (contract.valid_until is None or contract.valid_until >= today)
    )


def contract_payload(contract, organization):
    return {
        "id": str(contract.id),
        "projectId": str(contract.project_id),
        "contractType": contract.contract_type,
        "currency": contract.currency,
        "hourlyRate": contract.hourly_rate,
        "monthlyRate": contract.monthly_rate,
        "performanceAmount": contract.performance_amount,
        "minimumMinutes": contract.minimum_minutes,
        "maximumMinutes": contract.maximum_minutes,
        "baseMinutes": contract.base_minutes,
        "deductionRate": contract.deduction_rate,
        "overtimeRate": contract.overtime_rate,
        "taxRate": float(contract.tax_rate),
        "withholdingTaxRate": float(contract.withholding_tax_rate),
        "roundingUnitMinutes": contract.rounding_unit_minutes,
        "roundingMethod": contract.rounding_method,
        "closingDay": contract.closing_day,
        "paymentTermsDays": contract.payment_terms_days,
        "validFrom": contract.valid_from.isoformat(),
        "validUntil": (
            contract.valid_until.isoformat() if contract.valid_until else None
        ),
        "status": contract.status,
        "isCurrent": _is_current(contract, organization),
        "version": contract.version,
        "createdAt": contract.created_at.isoformat(),
        "updatedAt": contract.updated_at.isoformat(),
    }


class ContractCollectionView(APIView):
    def get(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        contracts = list_contracts(membership, project_id)
        return Response(
            {
                "items": [
                    contract_payload(item, membership.organization)
                    for item in contracts
                ]
            }
        )

    def post(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        serializer = ContractWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contract = ContractService.create(
            membership=membership,
            project_id=project_id,
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        response = Response(
            contract_payload(contract, membership.organization),
            status=status.HTTP_201_CREATED,
        )
        response["Location"] = f"/api/v1/projects/{project_id}/contracts/{contract.id}"
        return response


class ContractDetailView(APIView):
    def get(self, request, project_id, contract_id):
        membership = AuthService.current_context(request.user).membership
        contract = get_contract(membership, project_id, contract_id)
        return Response(contract_payload(contract, membership.organization))

    def patch(self, request, project_id, contract_id):
        membership = AuthService.current_context(request.user).membership
        serializer = ContractUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contract = ContractService.update(
            membership=membership,
            project_id=project_id,
            contract_id=contract_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        return Response(contract_payload(contract, membership.organization))

    def delete(self, request, project_id, contract_id):
        membership = AuthService.current_context(request.user).membership
        try:
            version = int(request.query_params.get("version", ""))
        except ValueError as exc:
            raise ValidationError({"version": "versionは必須です。"}) from exc
        if version < 1:
            raise ValidationError({"version": "versionは1以上で指定してください。"})
        ContractService.delete(
            membership=membership,
            project_id=project_id,
            contract_id=contract_id,
            expected_version=version,
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
