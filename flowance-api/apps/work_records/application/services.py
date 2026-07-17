"""Work record application use cases and transaction boundaries."""

from __future__ import annotations

from zoneinfo import ZoneInfo

from django.apps import apps
from django.db import transaction

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import (
    AuthorizationError,
    ConcurrentModificationError,
    ConflictError,
    ResourceNotFoundError,
)
from apps.organizations.models import OrganizationRole
from apps.projects.models import Project, ProjectMember
from apps.schedules.models import WorkSchedule

from ..domain.calculation import calculate_work_time
from ..infrastructure.rounding_rule import find_contract_rounding_rule
from ..models import WorkRecord, WorkRecordBreak


class WorkRecordNotFoundError(ResourceNotFoundError):
    code = "WORK_RECORD_NOT_FOUND"
    default_message = "稼働実績が見つかりません。"


class WorkRecordProjectNotFoundError(ResourceNotFoundError):
    code = "PROJECT_NOT_FOUND"
    default_message = "案件が見つかりません。"


class WorkRecordScheduleNotFoundError(ResourceNotFoundError):
    code = "WORK_SCHEDULE_NOT_FOUND"
    default_message = "個別予定が見つかりません。"


class WorkRecordFinalizedError(ConflictError):
    code = "WORK_RECORD_INCLUDED_IN_FINALIZED_SETTLEMENT"
    default_message = "確定済み精算に含まれる稼働実績は変更できません。"


def get_work_record(membership, record_id) -> WorkRecord:
    record = (
        WorkRecord.objects.for_organization(membership.organization)
        .select_related("project", "user", "work_schedule")
        .prefetch_related("breaks")
        .filter(pk=record_id)
        .first()
    )
    if record is None:
        raise WorkRecordNotFoundError()
    return record


def _get_project(membership, project_id) -> Project:
    project = (
        Project.objects.for_organization(membership.organization)
        .filter(pk=project_id)
        .first()
    )
    if project is None:
        raise WorkRecordProjectNotFoundError()
    return project


def _get_work_schedule(membership, work_schedule_id, *, project, user):
    if work_schedule_id is None:
        return None
    schedule = (
        WorkSchedule.objects.for_organization(membership.organization)
        .filter(pk=work_schedule_id, project=project, user=user)
        .first()
    )
    if schedule is None:
        raise WorkRecordScheduleNotFoundError()
    return schedule


def _require_editor(membership, project, *, user_id) -> None:
    if membership.role in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        return
    if membership.user_id != user_id:
        raise AuthorizationError()
    allowed = (
        ProjectMember.objects.for_organization(membership.organization)
        .filter(
            project=project,
            user=membership.user,
            can_edit_work_record=True,
        )
        .exists()
    )
    if not allowed:
        raise AuthorizationError()


def _is_in_finalized_settlement(record: WorkRecord) -> bool:
    try:
        settlement_model = apps.get_model("settlements", "MonthlyProjectSettlement")
    except LookupError:
        return False
    field_names = {field.name for field in settlement_model._meta.fields}
    required = {"organization", "project", "settlement_month", "status"}
    if not required.issubset(field_names):
        return False
    local_date = record.actual_start_at.astimezone(
        ZoneInfo(record.organization.timezone)
    ).date()
    month = local_date.replace(day=1)
    queryset = settlement_model.objects.filter(
        organization=record.organization,
        project=record.project,
        settlement_month=month,
        status="FINALIZED",
    )
    if "calculation_basis" in field_names:
        queryset = queryset.filter(calculation_basis="ACTUAL")
    return queryset.exists()


def _ensure_mutable(record: WorkRecord) -> None:
    if _is_in_finalized_settlement(record):
        raise WorkRecordFinalizedError()


def _calculate(*, membership, project, data):
    rule = find_contract_rounding_rule(
        organization=membership.organization,
        project=project,
        actual_start_at=data["actual_start_at"],
    )
    return calculate_work_time(
        actual_start_at=data["actual_start_at"],
        actual_end_at=data["actual_end_at"],
        breaks=data["breaks"],
        is_billable=data["is_billable"],
        rounding_unit_minutes=rule.unit_minutes,
        rounding_method=rule.method,
    )


def _replace_breaks(record, calculation) -> None:
    record.breaks.all().delete()
    WorkRecordBreak.objects.bulk_create(
        [
            WorkRecordBreak(
                organization=record.organization,
                work_record=record,
                start_at=item.start_at,
                end_at=item.end_at,
                break_minutes=item.minutes,
                sort_order=index,
            )
            for index, item in enumerate(calculation.breaks)
        ]
    )


class WorkRecordService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, data, trace_id=None) -> WorkRecord:
        project = _get_project(membership, data.pop("project_id"))
        user = membership.user
        _require_editor(membership, project, user_id=user.id)
        work_schedule = _get_work_schedule(
            membership,
            data.pop("work_schedule_id", None),
            project=project,
            user=user,
        )
        calculation = _calculate(
            membership=membership,
            project=project,
            data=data,
        )
        breaks = data.pop("breaks")
        del breaks
        record = WorkRecord.objects.create(
            organization=membership.organization,
            project=project,
            user=user,
            work_schedule=work_schedule,
            actual_minutes=calculation.actual_minutes,
            break_minutes=calculation.break_minutes,
            billable_minutes=calculation.billable_minutes,
            created_by=user,
            updated_by=user,
            **data,
        )
        _replace_breaks(record, calculation)
        AuditLogService.record(
            organization=membership.organization,
            actor_user=user,
            action="WORK_RECORD_CREATED",
            resource_type="work_record",
            resource_id=record.id,
            after={
                "projectId": str(project.id),
                "userId": str(user.id),
                "actualMinutes": record.actual_minutes,
                "breakMinutes": record.break_minutes,
                "billableMinutes": record.billable_minutes,
            },
            trace_id=trace_id,
        )
        return get_work_record(membership, record.id)

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        record_id,
        expected_version,
        data,
        trace_id=None,
    ) -> WorkRecord:
        record = (
            WorkRecord.objects.for_organization(membership.organization)
            .select_for_update(of=("self",))
            .select_related("project", "user", "work_schedule", "organization")
            .filter(pk=record_id)
            .first()
        )
        if record is None:
            raise WorkRecordNotFoundError()
        _require_editor(membership, record.project, user_id=record.user_id)
        _ensure_mutable(record)
        if record.version != expected_version:
            raise ConcurrentModificationError(expected_version, record.version)

        project = _get_project(membership, data.pop("project_id"))
        _require_editor(membership, project, user_id=record.user_id)
        work_schedule = _get_work_schedule(
            membership,
            data.pop("work_schedule_id", None),
            project=project,
            user=record.user,
        )
        calculation = _calculate(
            membership=membership,
            project=project,
            data=data,
        )
        breaks = data.pop("breaks")
        del breaks
        before = {
            "projectId": str(record.project_id),
            "actualMinutes": record.actual_minutes,
            "breakMinutes": record.break_minutes,
            "billableMinutes": record.billable_minutes,
            "version": record.version,
        }
        record.project = project
        record.work_schedule = work_schedule
        for field, value in data.items():
            setattr(record, field, value)
        record.actual_minutes = calculation.actual_minutes
        record.break_minutes = calculation.break_minutes
        record.billable_minutes = calculation.billable_minutes
        record.updated_by = membership.user
        record.advance_version()
        record.save()
        _replace_breaks(record, calculation)
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WORK_RECORD_UPDATED",
            resource_type="work_record",
            resource_id=record.id,
            before=before,
            after={
                "projectId": str(record.project_id),
                "actualMinutes": record.actual_minutes,
                "breakMinutes": record.break_minutes,
                "billableMinutes": record.billable_minutes,
                "version": record.version,
            },
            trace_id=trace_id,
        )
        return get_work_record(membership, record.id)

    @staticmethod
    @transaction.atomic
    def delete(
        *,
        membership,
        record_id,
        expected_version,
        trace_id=None,
    ) -> None:
        record = (
            WorkRecord.objects.for_organization(membership.organization)
            .select_for_update()
            .select_related("project", "organization")
            .filter(pk=record_id)
            .first()
        )
        if record is None:
            raise WorkRecordNotFoundError()
        _require_editor(membership, record.project, user_id=record.user_id)
        _ensure_mutable(record)
        if record.version != expected_version:
            raise ConcurrentModificationError(expected_version, record.version)
        record.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WORK_RECORD_DELETED",
            resource_type="work_record",
            resource_id=record.id,
            trace_id=trace_id,
        )
