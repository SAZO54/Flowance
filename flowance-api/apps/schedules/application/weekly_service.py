from django.db import transaction

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import ConcurrentModificationError, ResourceNotFoundError

from ..domain.generation import validate_weekly_schedule
from ..models import WeeklySchedule
from .access import (
    get_organization_user,
    get_schedule_project,
    require_schedule_editor,
)


class WeeklyScheduleNotFoundError(ResourceNotFoundError):
    code = "WEEKLY_SCHEDULE_NOT_FOUND"
    default_message = "週次予定が見つかりません。"


def get_weekly_schedule(membership, project_id, weekly_schedule_id):
    schedule = (
        WeeklySchedule.objects.for_organization(membership.organization)
        .select_related("project", "user")
        .filter(pk=weekly_schedule_id, project_id=project_id)
        .first()
    )
    if schedule is None:
        raise WeeklyScheduleNotFoundError()
    return schedule


def _validate(data) -> None:
    validate_weekly_schedule(
        start_time=data["start_time"],
        end_time=data["end_time"],
        break_minutes=data["break_minutes"],
        valid_from=data["valid_from"],
        valid_until=data.get("valid_until"),
    )


class WeeklyScheduleService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, project_id, data, trace_id=None) -> WeeklySchedule:
        project = get_schedule_project(membership, project_id)
        user = get_organization_user(membership, data.pop("user_id"))
        require_schedule_editor(membership, project, target_user_id=user.id)
        _validate(data)
        schedule = WeeklySchedule.objects.create(
            organization=membership.organization,
            project=project,
            user=user,
            created_by=membership.user,
            updated_by=membership.user,
            **data,
        )
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WEEKLY_SCHEDULE_CREATED",
            resource_type="weekly_schedule",
            resource_id=schedule.id,
            after={
                "projectId": str(project.id),
                "userId": str(user.id),
                "dayOfWeek": schedule.day_of_week,
            },
            trace_id=trace_id,
        )
        return schedule

    @staticmethod
    @transaction.atomic
    def bulk_create(*, membership, project_id, items, trace_id=None):
        created = [
            WeeklyScheduleService.create(
                membership=membership,
                project_id=project_id,
                data=dict(item),
                trace_id=trace_id,
            )
            for item in items
        ]
        return created, []

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        project_id,
        weekly_schedule_id,
        expected_version,
        data,
        trace_id=None,
    ) -> WeeklySchedule:
        schedule = (
            WeeklySchedule.objects.for_organization(membership.organization)
            .select_for_update(of=("self",))
            .select_related("project", "user")
            .filter(pk=weekly_schedule_id, project_id=project_id)
            .first()
        )
        if schedule is None:
            raise WeeklyScheduleNotFoundError()
        require_schedule_editor(
            membership, schedule.project, target_user_id=schedule.user_id
        )
        if schedule.version != expected_version:
            raise ConcurrentModificationError(expected_version, schedule.version)
        user = get_organization_user(membership, data.pop("user_id"))
        require_schedule_editor(membership, schedule.project, target_user_id=user.id)
        _validate(data)
        before = {
            "userId": str(schedule.user_id),
            "dayOfWeek": schedule.day_of_week,
            "version": schedule.version,
        }
        schedule.user = user
        for field, value in data.items():
            setattr(schedule, field, value)
        schedule.updated_by = membership.user
        schedule.advance_version()
        schedule.save()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WEEKLY_SCHEDULE_UPDATED",
            resource_type="weekly_schedule",
            resource_id=schedule.id,
            before=before,
            after={
                "userId": str(schedule.user_id),
                "dayOfWeek": schedule.day_of_week,
                "version": schedule.version,
            },
            trace_id=trace_id,
        )
        return schedule

    @staticmethod
    @transaction.atomic
    def delete(
        *,
        membership,
        project_id,
        weekly_schedule_id,
        expected_version,
        trace_id=None,
    ) -> None:
        schedule = (
            WeeklySchedule.objects.for_organization(membership.organization)
            .select_for_update()
            .select_related("project")
            .filter(pk=weekly_schedule_id, project_id=project_id)
            .first()
        )
        if schedule is None:
            raise WeeklyScheduleNotFoundError()
        require_schedule_editor(
            membership, schedule.project, target_user_id=schedule.user_id
        )
        if schedule.version != expected_version:
            raise ConcurrentModificationError(expected_version, schedule.version)
        schedule.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="WEEKLY_SCHEDULE_DELETED",
            resource_type="weekly_schedule",
            resource_id=schedule.id,
            trace_id=trace_id,
        )
