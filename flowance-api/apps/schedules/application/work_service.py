from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from zoneinfo import ZoneInfo

from django.db import transaction

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import ConcurrentModificationError, ResourceNotFoundError

from ..domain.generation import (
    ScheduleCandidate,
    WeeklyTemplate,
    expand_weekly_templates,
    overlaps,
    validate_work_schedule,
)
from ..models import (
    WeeklySchedule,
    WeeklyScheduleStatus,
    WorkSchedule,
    WorkScheduleStatus,
)
from .access import get_schedule_project, require_schedule_editor
from .weekly_service import WeeklyScheduleNotFoundError


class WorkScheduleNotFoundError(ResourceNotFoundError):
    code = "WORK_SCHEDULE_NOT_FOUND"
    default_message = "個別予定が見つかりません。"


@dataclass(frozen=True, slots=True)
class GenerationResult:
    dry_run: bool
    created_count: int
    skipped_count: int
    items: list[WorkSchedule]
    warnings: list[dict]


def get_work_schedule(membership, work_schedule_id) -> WorkSchedule:
    schedule = (
        WorkSchedule.objects.for_organization(membership.organization)
        .select_related("project", "user", "weekly_schedule")
        .filter(pk=work_schedule_id)
        .first()
    )
    if schedule is None:
        raise WorkScheduleNotFoundError()
    return schedule


def _overlap_warnings(
    *,
    organization,
    user_id,
    start_at,
    end_at,
    target_id,
    exclude_id=None,
) -> list[dict]:
    queryset = WorkSchedule.objects.for_organization(organization).filter(
        user_id=user_id,
        status=WorkScheduleStatus.PLANNED,
        scheduled_start_at__lt=end_at,
        scheduled_end_at__gt=start_at,
    )
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    conflict_ids = [str(value) for value in queryset.values_list("id", flat=True)]
    if not conflict_ids:
        return []
    return [
        {
            "code": "WARNING_SCHEDULE_OVERLAP",
            "message": "同じ利用者の予定時間が重複しています。",
            "targetId": str(target_id) if target_id else None,
            "conflictIds": conflict_ids,
            "severity": "WARNING",
        }
    ]


class WorkScheduleService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, data, trace_id=None):
        project = get_schedule_project(membership, data.pop("project_id"))
        require_schedule_editor(membership, project, target_user_id=membership.user_id)
        validate_work_schedule(
            scheduled_start_at=data["scheduled_start_at"],
            scheduled_end_at=data["scheduled_end_at"],
            break_minutes=0,
        )
        schedule = WorkSchedule(
            organization=membership.organization,
            project=project,
            user=membership.user,
            break_minutes=0,
            status=WorkScheduleStatus.PLANNED,
            is_generated=False,
            is_manually_overridden=True,
            created_by=membership.user,
            updated_by=membership.user,
            **data,
        )
        warnings = _overlap_warnings(
            organization=membership.organization,
            user_id=schedule.user_id,
            start_at=schedule.scheduled_start_at,
            end_at=schedule.scheduled_end_at,
            target_id=schedule.id,
        )
        schedule.save()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WORK_SCHEDULE_CREATED",
            resource_type="work_schedule",
            resource_id=schedule.id,
            after={
                "projectId": str(project.id),
                "userId": str(schedule.user_id),
                "warningCount": len(warnings),
            },
            trace_id=trace_id,
        )
        return schedule, warnings

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        work_schedule_id,
        expected_version,
        data,
        trace_id=None,
    ):
        schedule = (
            WorkSchedule.objects.for_organization(membership.organization)
            .select_for_update(of=("self",))
            .select_related("project", "user")
            .filter(pk=work_schedule_id)
            .first()
        )
        if schedule is None:
            raise WorkScheduleNotFoundError()
        require_schedule_editor(
            membership, schedule.project, target_user_id=schedule.user_id
        )
        if schedule.version != expected_version:
            raise ConcurrentModificationError(expected_version, schedule.version)
        project = get_schedule_project(membership, data.pop("project_id"))
        require_schedule_editor(membership, project, target_user_id=schedule.user_id)
        validate_work_schedule(
            scheduled_start_at=data["scheduled_start_at"],
            scheduled_end_at=data["scheduled_end_at"],
            break_minutes=schedule.break_minutes,
        )
        before = {
            "projectId": str(schedule.project_id),
            "scheduledStartAt": schedule.scheduled_start_at.isoformat(),
            "scheduledEndAt": schedule.scheduled_end_at.isoformat(),
            "version": schedule.version,
        }
        schedule.project = project
        for field, value in data.items():
            setattr(schedule, field, value)
        schedule.is_manually_overridden = True
        schedule.updated_by = membership.user
        schedule.advance_version()
        warnings = _overlap_warnings(
            organization=membership.organization,
            user_id=schedule.user_id,
            start_at=schedule.scheduled_start_at,
            end_at=schedule.scheduled_end_at,
            target_id=schedule.id,
            exclude_id=schedule.id,
        )
        schedule.save()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WORK_SCHEDULE_UPDATED",
            resource_type="work_schedule",
            resource_id=schedule.id,
            before=before,
            after={
                "projectId": str(schedule.project_id),
                "scheduledStartAt": schedule.scheduled_start_at.isoformat(),
                "scheduledEndAt": schedule.scheduled_end_at.isoformat(),
                "version": schedule.version,
                "warningCount": len(warnings),
            },
            trace_id=trace_id,
        )
        return schedule, warnings

    @staticmethod
    @transaction.atomic
    def delete(
        *,
        membership,
        work_schedule_id,
        expected_version,
        trace_id=None,
    ) -> None:
        schedule = (
            WorkSchedule.objects.for_organization(membership.organization)
            .select_for_update()
            .select_related("project")
            .filter(pk=work_schedule_id)
            .first()
        )
        if schedule is None:
            raise WorkScheduleNotFoundError()
        require_schedule_editor(
            membership, schedule.project, target_user_id=schedule.user_id
        )
        if schedule.version != expected_version:
            raise ConcurrentModificationError(expected_version, schedule.version)
        schedule.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WORK_SCHEDULE_DELETED",
            resource_type="work_schedule",
            resource_id=schedule.id,
            trace_id=trace_id,
        )

    @staticmethod
    @transaction.atomic
    def generate(
        *,
        membership,
        project_id,
        from_date: date,
        to_date: date,
        weekly_schedule_ids,
        dry_run: bool,
        trace_id=None,
    ) -> GenerationResult:
        project = get_schedule_project(membership, project_id)
        require_schedule_editor(membership, project)

        templates_queryset = (
            WeeklySchedule.objects.for_organization(membership.organization)
            .filter(
                project=project,
                status=WeeklyScheduleStatus.ACTIVE,
            )
            .select_related("user")
        )
        if weekly_schedule_ids is not None:
            if len(weekly_schedule_ids) > 50:
                from ..domain.generation import ScheduleGenerationLimitExceededError

                raise ScheduleGenerationLimitExceededError(
                    "一度に指定できる週次予定は50件までです。"
                )
            templates_queryset = templates_queryset.filter(id__in=weekly_schedule_ids)
        templates = list(templates_queryset.order_by("day_of_week", "start_time"))
        if weekly_schedule_ids is not None and len(templates) != len(
            set(weekly_schedule_ids)
        ):
            raise WeeklyScheduleNotFoundError()

        for template in templates:
            require_schedule_editor(
                membership, project, target_user_id=template.user_id
            )
        domain_templates = [
            WeeklyTemplate(
                id=template.id,
                project_id=template.project_id,
                user_id=template.user_id,
                day_of_week=template.day_of_week,
                start_time=template.start_time,
                end_time=template.end_time,
                break_minutes=template.break_minutes,
                valid_from=template.valid_from,
                valid_until=template.valid_until,
            )
            for template in templates
        ]
        candidates = expand_weekly_templates(
            templates=domain_templates,
            from_date=from_date,
            to_date=to_date,
            timezone_name=membership.organization.timezone,
            project_name=project.name,
        )

        timezone = ZoneInfo(membership.organization.timezone)
        existing = list(
            WorkSchedule.objects.for_organization(membership.organization)
            .filter(
                scheduled_start_at__date__lte=to_date,
                scheduled_end_at__date__gte=from_date,
            )
            .order_by("scheduled_start_at")
        )
        exact_source_keys = {
            (
                schedule.weekly_schedule_id,
                schedule.scheduled_start_at,
                schedule.scheduled_end_at,
            )
            for schedule in existing
            if schedule.weekly_schedule_id
        }
        protected_source_dates = {
            (
                schedule.weekly_schedule_id,
                schedule.scheduled_start_at.astimezone(timezone).date(),
            )
            for schedule in existing
            if schedule.weekly_schedule_id and schedule.is_manually_overridden
        }

        accepted: list[ScheduleCandidate] = []
        warnings: list[dict] = []
        skipped_count = 0
        for candidate in candidates:
            exact_key = (
                candidate.weekly_schedule_id,
                candidate.scheduled_start_at,
                candidate.scheduled_end_at,
            )
            source_date_key = (
                candidate.weekly_schedule_id,
                candidate.scheduled_start_at.date(),
            )
            if exact_key in exact_source_keys:
                skipped_count += 1
                continue
            if source_date_key in protected_source_dates:
                skipped_count += 1
                warnings.append(
                    {
                        "code": "WARNING_MANUAL_OVERRIDE_PROTECTED",
                        "message": "手動変更済みの予定は上書きしませんでした。",
                        "targetId": None,
                        "conflictIds": [],
                        "severity": "WARNING",
                    }
                )
                continue

            conflicts = [
                str(schedule.id)
                for schedule in existing
                if schedule.user_id == candidate.user_id
                and schedule.status == WorkScheduleStatus.PLANNED
                and overlaps(
                    candidate.scheduled_start_at,
                    candidate.scheduled_end_at,
                    schedule.scheduled_start_at,
                    schedule.scheduled_end_at,
                )
            ]
            conflicts.extend(
                str(other.id)
                for other in accepted
                if other.user_id == candidate.user_id
                and overlaps(
                    candidate.scheduled_start_at,
                    candidate.scheduled_end_at,
                    other.scheduled_start_at,
                    other.scheduled_end_at,
                )
            )
            if conflicts:
                warnings.append(
                    {
                        "code": "WARNING_SCHEDULE_OVERLAP",
                        "message": "同じ利用者の予定時間が重複しています。",
                        "targetId": str(candidate.id),
                        "conflictIds": conflicts,
                        "severity": "WARNING",
                    }
                )
            accepted.append(candidate)

        schedules = [
            WorkSchedule(
                id=candidate.id,
                organization=membership.organization,
                project=project,
                user_id=candidate.user_id,
                weekly_schedule_id=candidate.weekly_schedule_id,
                title=candidate.title,
                scheduled_start_at=candidate.scheduled_start_at,
                scheduled_end_at=candidate.scheduled_end_at,
                break_minutes=candidate.break_minutes,
                status=WorkScheduleStatus.PLANNED,
                is_generated=True,
                is_manually_overridden=False,
                created_by=membership.user,
                updated_by=membership.user,
            )
            for candidate in accepted
        ]
        if not dry_run:
            WorkSchedule.objects.bulk_create(schedules)
            AuditLogService.record(
                organization=membership.organization,
                actor_user=membership.user,
                action="WORK_SCHEDULES_GENERATED",
                resource_type="project",
                resource_id=project.id,
                after={
                    "createdCount": len(schedules),
                    "skippedCount": skipped_count,
                    "warningCount": len(warnings),
                    "fromDate": from_date.isoformat(),
                    "toDate": to_date.isoformat(),
                },
                trace_id=trace_id,
            )
        return GenerationResult(
            dry_run=dry_run,
            created_count=len(schedules),
            skipped_count=skipped_count,
            items=schedules,
            warnings=warnings,
        )
