"""Application services for organization-scoped project contracts."""

from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Q

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import (
    AuthorizationError,
    ConcurrentModificationError,
    ConflictError,
    ResourceNotFoundError,
)
from apps.organizations.models import OrganizationRole
from apps.projects.models import Project
from apps.settlements.models import MonthlyProjectSettlement, SettlementStatus

from ..domain.validation import validate_contract_conditions
from ..models import ProjectContract


class ContractProjectNotFoundError(ResourceNotFoundError):
    code = "PROJECT_NOT_FOUND"
    default_message = "案件が見つかりません。"


class ContractNotFoundError(ResourceNotFoundError):
    code = "CONTRACT_NOT_FOUND"
    default_message = "契約が見つかりません。"


class ContractPeriodOverlapError(ConflictError):
    code = "CONTRACT_PERIOD_OVERLAP"
    default_message = "同じ案件の契約期間が重複しています。"


class ContractInUseError(ConflictError):
    code = "CONTRACT_IN_USE"
    default_message = "未確定精算で使用中の契約は削除できません。"


def require_contract_editor(membership) -> None:
    if membership.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        raise AuthorizationError()


def _project(membership, project_id) -> Project:
    project = (
        Project.objects.for_organization(membership.organization)
        .filter(pk=project_id)
        .first()
    )
    if project is None:
        raise ContractProjectNotFoundError()
    return project


def list_contracts(membership, project_id):
    project = _project(membership, project_id)
    return (
        ProjectContract.objects.for_organization(membership.organization)
        .filter(project=project)
        .order_by("-valid_from", "-created_at")
    )


def get_contract(membership, project_id, contract_id) -> ProjectContract:
    project = _project(membership, project_id)
    contract = (
        ProjectContract.objects.for_organization(membership.organization)
        .filter(project=project, pk=contract_id)
        .first()
    )
    if contract is None:
        raise ContractNotFoundError()
    return contract


def _overlaps(
    *,
    organization,
    project,
    valid_from,
    valid_until,
    exclude_id=None,
) -> bool:
    queryset = ProjectContract.objects.for_organization(organization).filter(
        project=project
    )
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    if valid_until is not None:
        queryset = queryset.filter(valid_from__lte=valid_until)
    return queryset.filter(
        Q(valid_until__isnull=True) | Q(valid_until__gte=valid_from)
    ).exists()


def _snapshot(contract: ProjectContract) -> dict:
    return {
        "projectId": str(contract.project_id),
        "contractType": contract.contract_type,
        "validFrom": contract.valid_from.isoformat(),
        "validUntil": (
            contract.valid_until.isoformat() if contract.valid_until else None
        ),
        "status": contract.status,
        "version": contract.version,
    }


class ContractService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, project_id, data, trace_id=None) -> ProjectContract:
        require_contract_editor(membership)
        project = _project(membership, project_id)
        validate_contract_conditions(data)
        if _overlaps(
            organization=membership.organization,
            project=project,
            valid_from=data["valid_from"],
            valid_until=data.get("valid_until"),
        ):
            raise ContractPeriodOverlapError()
        contract = ProjectContract(
            organization=membership.organization,
            project=project,
            created_by=membership.user,
            updated_by=membership.user,
            **data,
        )
        try:
            with transaction.atomic():
                contract.save()
        except IntegrityError as exc:
            raise ContractPeriodOverlapError() from exc
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="CONTRACT_CREATED",
            resource_type="contract",
            resource_id=contract.id,
            after=_snapshot(contract),
            trace_id=trace_id,
        )
        return contract

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        project_id,
        contract_id,
        expected_version,
        data,
        trace_id=None,
    ) -> ProjectContract:
        require_contract_editor(membership)
        project = _project(membership, project_id)
        contract = (
            ProjectContract.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(project=project, pk=contract_id)
            .first()
        )
        if contract is None:
            raise ContractNotFoundError()
        if contract.version != expected_version:
            raise ConcurrentModificationError(expected_version, contract.version)
        validate_contract_conditions(data)
        if _overlaps(
            organization=membership.organization,
            project=project,
            valid_from=data["valid_from"],
            valid_until=data.get("valid_until"),
            exclude_id=contract.id,
        ):
            raise ContractPeriodOverlapError()
        before = _snapshot(contract)
        for field, value in data.items():
            setattr(contract, field, value)
        contract.updated_by = membership.user
        contract.advance_version()
        try:
            with transaction.atomic():
                contract.save()
        except IntegrityError as exc:
            raise ContractPeriodOverlapError() from exc
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="CONTRACT_UPDATED",
            resource_type="contract",
            resource_id=contract.id,
            before=before,
            after=_snapshot(contract),
            trace_id=trace_id,
        )
        return contract

    @staticmethod
    @transaction.atomic
    def delete(
        *, membership, project_id, contract_id, expected_version, trace_id=None
    ) -> None:
        require_contract_editor(membership)
        project = _project(membership, project_id)
        contract = (
            ProjectContract.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(project=project, pk=contract_id)
            .first()
        )
        if contract is None:
            raise ContractNotFoundError()
        if contract.version != expected_version:
            raise ConcurrentModificationError(expected_version, contract.version)
        if (
            MonthlyProjectSettlement.objects.for_organization(membership.organization)
            .filter(contract=contract, status=SettlementStatus.CALCULATED)
            .exists()
        ):
            raise ContractInUseError()
        before = _snapshot(contract)
        contract.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="CONTRACT_DELETED",
            resource_type="contract",
            resource_id=contract.id,
            before=before,
            trace_id=trace_id,
        )
