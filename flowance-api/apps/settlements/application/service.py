from __future__ import annotations

import hashlib
import json
from datetime import datetime, time
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import (
    AuthorizationError,
    ConcurrentModificationError,
    ConflictError,
    ResourceNotFoundError,
)
from apps.contracts.models import ContractStatus, ProjectContract
from apps.organizations.models import OrganizationRole
from apps.projects.models import Project
from apps.schedules.models import WorkSchedule, WorkScheduleStatus
from apps.work_records.models import WorkRecord, WorkRecordStatus

from ..domain.calculation import SettlementContractTerms, calculate_amounts
from ..models import (
    IdempotencyKey,
    MonthlyProjectSettlement,
    SettlementLine,
    SettlementLineType,
    SettlementStatus,
)


class SettlementNotFoundError(ResourceNotFoundError):
    code = "SETTLEMENT_NOT_FOUND"
    default_message = "精算が見つかりません。"


class SettlementTargetNotFoundError(ResourceNotFoundError):
    code = "SETTLEMENT_TARGET_NOT_FOUND"
    default_message = "対象月に適用できる契約がありません。"


class MultipleContractsError(ConflictError):
    code = "MULTIPLE_CONTRACTS_FOUND"
    default_message = "対象月に複数の契約が適用されています。"


class SettlementAlreadyExistsError(ConflictError):
    code = "SETTLEMENT_ALREADY_EXISTS"
    default_message = "対象月の精算は既に作成されています。"


class SettlementFinalizedError(ConflictError):
    code = "SETTLEMENT_ALREADY_FINALIZED"
    default_message = "確定済みの精算は変更または削除できません。"


class IdempotencyConflictError(ConflictError):
    code = "IDEMPOTENCY_KEY_CONFLICT"
    default_message = "同じIdempotency-Keyが異なるリクエストに使用されています。"


def _require_admin(membership):
    if membership.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        raise AuthorizationError()


def get_settlement(membership, settlement_id):
    settlement = (
        MonthlyProjectSettlement.objects.for_organization(membership.organization)
        .select_related("project", "contract", "finalized_by")
        .prefetch_related("lines")
        .filter(pk=settlement_id)
        .first()
    )
    if settlement is None:
        raise SettlementNotFoundError()
    return settlement


def _month_end(month):
    return (
        month.replace(year=month.year + 1, month=1)
        if month.month == 12
        else month.replace(month=month.month + 1)
    )


def _boundaries(organization, month):
    tz = ZoneInfo(organization.timezone)
    return (
        datetime.combine(month, time.min, tzinfo=tz),
        datetime.combine(_month_end(month), time.min, tzinfo=tz),
    )


def _project_and_contract(membership, project_id, month):
    project = (
        Project.objects.for_organization(membership.organization)
        .filter(pk=project_id)
        .first()
    )
    if project is None:
        raise SettlementTargetNotFoundError()
    contracts = list(
        ProjectContract.objects.for_organization(membership.organization)
        .filter(
            project=project,
            status=ContractStatus.ACTIVE,
            valid_from__lt=_month_end(month),
        )
        .filter(valid_until__isnull=True)
        | ProjectContract.objects.for_organization(membership.organization).filter(
            project=project,
            status=ContractStatus.ACTIVE,
            valid_from__lt=_month_end(month),
            valid_until__gte=month,
        )
    )
    contracts = list({item.id: item for item in contracts}.values())
    if not contracts:
        raise SettlementTargetNotFoundError()
    if len(contracts) > 1:
        raise MultipleContractsError()
    return project, contracts[0]


def _minutes(membership, project, month):
    start_at, end_at = _boundaries(membership.organization, month)
    schedules = WorkSchedule.objects.for_organization(membership.organization).filter(
        project=project,
        status=WorkScheduleStatus.PLANNED,
        scheduled_start_at__gte=start_at,
        scheduled_start_at__lt=end_at,
    )
    scheduled = sum(
        max(
            int((item.scheduled_end_at - item.scheduled_start_at).total_seconds() // 60)
            - item.break_minutes,
            0,
        )
        for item in schedules
    )
    actuals = WorkRecord.objects.for_organization(membership.organization).filter(
        project=project,
        status__in=(WorkRecordStatus.DRAFT, WorkRecordStatus.CONFIRMED),
        actual_start_at__gte=start_at,
        actual_start_at__lt=end_at,
    )
    sums = actuals.aggregate(
        actual=Sum("actual_minutes"), billable=Sum("billable_minutes")
    )
    return (
        scheduled,
        sums["actual"] or 0,
        sums["billable"] or 0,
        schedules.count(),
        actuals.count(),
    )


def _contract_snapshot(contract):
    fields = (
        "contract_type",
        "currency",
        "hourly_rate",
        "monthly_rate",
        "base_minutes",
        "deduction_rate",
        "overtime_rate",
        "performance_amount",
        "tax_rate",
        "withholding_tax_rate",
        "rounding_unit_minutes",
        "rounding_method",
        "valid_from",
        "valid_until",
    )
    result = {}
    for field in fields:
        value = getattr(contract, field)
        result[field] = (
            value.isoformat()
            if hasattr(value, "isoformat")
            else (str(value) if value is not None else None)
        )
    return result


def _contract_terms(contract):
    return SettlementContractTerms(
        contract_type=contract.contract_type,
        hourly_rate=contract.hourly_rate,
        monthly_rate=contract.monthly_rate,
        base_minutes=contract.base_minutes,
        deduction_rate=contract.deduction_rate,
        overtime_rate=contract.overtime_rate,
        performance_amount=contract.performance_amount,
        tax_rate=contract.tax_rate,
        withholding_tax_rate=contract.withholding_tax_rate,
    )


def _calculation(membership, project, contract, month, basis):
    scheduled, actual, billable, schedule_count, record_count = _minutes(
        membership, project, month
    )
    target = billable if basis == "ACTUAL" else scheduled
    amounts = calculate_amounts(
        contract_terms=_contract_terms(contract), target_minutes=target
    )
    snapshot = {
        "schemaVersion": 1,
        "calculatedAt": timezone.now().isoformat(),
        "calculatedBy": str(membership.user_id),
        "projectId": str(project.id),
        "contractId": str(contract.id),
        "settlementMonth": month.isoformat(),
        "calculationBasis": basis,
        "targetMinutes": target,
        "scheduledMinutes": scheduled,
        "actualMinutes": actual,
        "billableMinutes": billable,
        "scheduleCount": schedule_count,
        "workRecordCount": record_count,
        "contract": _contract_snapshot(contract),
        "amounts": amounts.__dict__,
    }
    return scheduled, actual, billable, amounts, snapshot


def _replace_lines(settlement):
    settlement.lines.all().delete()
    definitions = (
        (SettlementLineType.BASE, "基本金額", settlement.base_amount),
        (SettlementLineType.DEDUCTION, "控除額", settlement.deduction_amount),
        (SettlementLineType.OVERTIME, "超過額", settlement.overtime_amount),
        (SettlementLineType.TAX, "消費税額", settlement.tax_amount),
        (SettlementLineType.WITHHOLDING, "源泉徴収額", settlement.withholding_amount),
    )
    SettlementLine.objects.bulk_create(
        [
            SettlementLine(
                organization=settlement.organization,
                settlement=settlement,
                line_type=line_type,
                label=label,
                amount=amount,
                sort_order=index,
            )
            for index, (line_type, label, amount) in enumerate(definitions)
        ]
    )


class SettlementService:
    @staticmethod
    @transaction.atomic
    def calculate(*, membership, project_id, month, basis, trace_id=None):
        _require_admin(membership)
        if (
            MonthlyProjectSettlement.objects.for_organization(membership.organization)
            .filter(project_id=project_id, settlement_month=month)
            .exists()
        ):
            raise SettlementAlreadyExistsError()
        project, contract = _project_and_contract(membership, project_id, month)
        scheduled, actual, billable, amounts, snapshot = _calculation(
            membership, project, contract, month, basis
        )
        settlement = MonthlyProjectSettlement.objects.create(
            organization=membership.organization,
            project=project,
            contract=contract,
            settlement_month=month,
            calculation_basis=basis,
            scheduled_minutes=scheduled,
            actual_minutes=actual,
            billable_minutes=billable,
            calculation_snapshot=snapshot,
            created_by=membership.user,
            updated_by=membership.user,
            **amounts.__dict__,
        )
        _replace_lines(settlement)
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="SETTLEMENT_CALCULATED",
            resource_type="settlement",
            resource_id=settlement.id,
            after=snapshot,
            trace_id=trace_id,
        )
        return get_settlement(membership, settlement.id)

    @staticmethod
    @transaction.atomic
    def recalculate(*, membership, settlement_id, expected_version, trace_id=None):
        _require_admin(membership)
        settlement = (
            MonthlyProjectSettlement.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(pk=settlement_id)
            .first()
        )
        if settlement is None:
            raise SettlementNotFoundError()
        if settlement.status == SettlementStatus.FINALIZED:
            raise SettlementFinalizedError()
        if settlement.version != expected_version:
            raise ConcurrentModificationError(expected_version, settlement.version)
        project, contract = _project_and_contract(
            membership, settlement.project_id, settlement.settlement_month
        )
        values = _calculation(
            membership,
            project,
            contract,
            settlement.settlement_month,
            settlement.calculation_basis,
        )
        scheduled, actual, billable, amounts, snapshot = values
        before = settlement.calculation_snapshot
        settlement.contract = contract
        settlement.scheduled_minutes = scheduled
        settlement.actual_minutes = actual
        settlement.billable_minutes = billable
        for name, value in amounts.__dict__.items():
            setattr(settlement, name, value)
        settlement.calculation_snapshot = snapshot
        settlement.updated_by = membership.user
        settlement.advance_version()
        settlement.save()
        _replace_lines(settlement)
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="SETTLEMENT_RECALCULATED",
            resource_type="settlement",
            resource_id=settlement.id,
            before=before,
            after=snapshot,
            trace_id=trace_id,
        )
        return get_settlement(membership, settlement.id)

    @staticmethod
    @transaction.atomic
    def finalize(
        *, membership, settlement_id, expected_version, idempotency_key, trace_id=None
    ):
        _require_admin(membership)
        endpoint = f"settlements/{settlement_id}/finalize"
        request_hash = hashlib.sha256(
            json.dumps({"version": expected_version}, sort_keys=True).encode()
        ).hexdigest()
        saved = IdempotencyKey.objects.filter(
            organization=membership.organization,
            user=membership.user,
            endpoint=endpoint,
            key=idempotency_key,
        ).first()
        if saved:
            if saved.request_hash != request_hash:
                raise IdempotencyConflictError()
            return get_settlement(membership, settlement_id)
        settlement = (
            MonthlyProjectSettlement.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(pk=settlement_id)
            .first()
        )
        if settlement is None:
            raise SettlementNotFoundError()
        if settlement.status == SettlementStatus.FINALIZED:
            raise SettlementFinalizedError()
        if settlement.version != expected_version:
            raise ConcurrentModificationError(expected_version, settlement.version)
        settlement.status = SettlementStatus.FINALIZED
        settlement.finalized_at = timezone.now()
        settlement.finalized_by = membership.user
        settlement.updated_by = membership.user
        settlement.advance_version()
        settlement.save()
        IdempotencyKey.objects.create(
            organization=membership.organization,
            user=membership.user,
            endpoint=endpoint,
            key=idempotency_key,
            request_hash=request_hash,
            response_status=200,
            response_body={"settlementId": str(settlement.id)},
        )
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="SETTLEMENT_FINALIZED",
            resource_type="settlement",
            resource_id=settlement.id,
            after={"status": settlement.status, "version": settlement.version},
            trace_id=trace_id,
        )
        return get_settlement(membership, settlement.id)

    @staticmethod
    @transaction.atomic
    def delete(*, membership, settlement_id, expected_version, trace_id=None):
        _require_admin(membership)
        settlement = (
            MonthlyProjectSettlement.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(pk=settlement_id)
            .first()
        )
        if settlement is None:
            raise SettlementNotFoundError()
        if settlement.status == SettlementStatus.FINALIZED:
            raise SettlementFinalizedError()
        if settlement.version != expected_version:
            raise ConcurrentModificationError(expected_version, settlement.version)
        settlement.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="SETTLEMENT_DELETED",
            resource_type="settlement",
            resource_id=settlement.id,
            before={"status": settlement.status, "version": settlement.version},
            trace_id=trace_id,
        )
