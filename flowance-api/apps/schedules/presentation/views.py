from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService

from ..application.weekly_service import WeeklyScheduleService
from ..application.work_service import (
    WorkScheduleService,
    get_work_schedule,
)
from ..models import WeeklySchedule, WorkSchedule
from .serializers import (
    CalendarQuerySerializer,
    DateTimeRangeQuerySerializer,
    GenerateWorkSchedulesSerializer,
    WeeklyScheduleBulkSerializer,
    WeeklyScheduleUpdateSerializer,
    WeeklyScheduleWriteSerializer,
    WorkScheduleUpdateSerializer,
    WorkScheduleWriteSerializer,
)


def weekly_schedule_payload(schedule):
    return {
        "id": str(schedule.id),
        "projectId": str(schedule.project_id),
        "userId": str(schedule.user_id),
        "dayOfWeek": schedule.day_of_week,
        "startTime": schedule.start_time.strftime("%H:%M"),
        "endTime": schedule.end_time.strftime("%H:%M"),
        "breakMinutes": schedule.break_minutes,
        "validFrom": schedule.valid_from.isoformat(),
        "validUntil": (
            schedule.valid_until.isoformat() if schedule.valid_until else None
        ),
        "status": schedule.status,
        "version": schedule.version,
    }


def work_schedule_payload(schedule):
    created_at = getattr(schedule, "created_at", None)
    updated_at = getattr(schedule, "updated_at", None)
    return {
        "id": str(schedule.id),
        "projectId": str(schedule.project_id),
        "userId": str(schedule.user_id),
        "weeklyScheduleId": (
            str(schedule.weekly_schedule_id) if schedule.weekly_schedule_id else None
        ),
        "title": schedule.title,
        "scheduledStartAt": schedule.scheduled_start_at.isoformat(),
        "scheduledEndAt": schedule.scheduled_end_at.isoformat(),
        "breakMinutes": schedule.break_minutes,
        "status": schedule.status,
        "isGenerated": schedule.is_generated,
        "isManuallyOverridden": schedule.is_manually_overridden,
        "notes": schedule.notes,
        "version": schedule.version,
        "createdAt": created_at.isoformat() if created_at else None,
        "updatedAt": updated_at.isoformat() if updated_at else None,
    }


def _required_version(request):
    try:
        version = int(request.query_params.get("version", ""))
    except ValueError as exc:
        raise ValidationError({"version": "versionは必須です。"}) from exc
    if version < 1:
        raise ValidationError({"version": "versionは1以上で指定してください。"})
    return version


def _uuid_csv(value, field):
    if not value:
        return []
    serializer = serializers.ListField(child=serializers.UUIDField())
    try:
        return serializer.run_validation(value.split(","))
    except serializers.ValidationError as exc:
        raise ValidationError({field: exc.detail}) from exc


class WeeklyScheduleCollectionView(APIView):
    def get(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        from ..application.access import get_schedule_project

        get_schedule_project(membership, project_id)
        items = (
            WeeklySchedule.objects.for_organization(membership.organization)
            .filter(project_id=project_id)
            .select_related("user")
            .order_by("day_of_week", "start_time", "id")
        )
        return Response({"items": [weekly_schedule_payload(item) for item in items]})

    def post(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        serializer = WeeklyScheduleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = WeeklyScheduleService.create(
            membership=membership,
            project_id=project_id,
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        response = Response(
            weekly_schedule_payload(schedule), status=status.HTTP_201_CREATED
        )
        response["Location"] = (
            f"/api/v1/projects/{project_id}/weekly-schedules/{schedule.id}"
        )
        return response


class WeeklyScheduleBulkView(APIView):
    def post(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        serializer = WeeklyScheduleBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items, warnings = WeeklyScheduleService.bulk_create(
            membership=membership,
            project_id=project_id,
            items=serializer.model_items(),
            trace_id=request.trace_id,
        )
        return Response(
            {
                "items": [weekly_schedule_payload(item) for item in items],
                "warnings": warnings,
            },
            status=status.HTTP_201_CREATED,
        )


class WeeklyScheduleDetailView(APIView):
    def patch(self, request, project_id, weekly_schedule_id):
        membership = AuthService.current_context(request.user).membership
        serializer = WeeklyScheduleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = WeeklyScheduleService.update(
            membership=membership,
            project_id=project_id,
            weekly_schedule_id=weekly_schedule_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        return Response(weekly_schedule_payload(schedule))

    def delete(self, request, project_id, weekly_schedule_id):
        membership = AuthService.current_context(request.user).membership
        WeeklyScheduleService.delete(
            membership=membership,
            project_id=project_id,
            weekly_schedule_id=weekly_schedule_id,
            expected_version=_required_version(request),
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkScheduleCollectionView(APIView):
    def get(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = DateTimeRangeQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        queryset = (
            WorkSchedule.objects.for_organization(membership.organization)
            .filter(
                scheduled_start_at__lt=values["to"],
                scheduled_end_at__gt=values["from"],
            )
            .select_related("project", "user", "weekly_schedule")
        )
        if values.get("projectId"):
            queryset = queryset.filter(project_id=values["projectId"])
        return Response(
            {
                "items": [
                    work_schedule_payload(item)
                    for item in queryset.order_by("scheduled_start_at", "id")
                ]
            }
        )

    def post(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = WorkScheduleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule, warnings = WorkScheduleService.create(
            membership=membership,
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        response = Response(
            {"item": work_schedule_payload(schedule), "warnings": warnings},
            status=status.HTTP_201_CREATED,
        )
        response["Location"] = f"/api/v1/work-schedules/{schedule.id}"
        return response


class WorkScheduleGenerateView(APIView):
    def post(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = GenerateWorkSchedulesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        result = WorkScheduleService.generate(
            membership=membership,
            project_id=values["projectId"],
            from_date=values["fromDate"],
            to_date=values["toDate"],
            weekly_schedule_ids=values.get("weeklyScheduleIds"),
            dry_run=values.get("dryRun", False),
            trace_id=request.trace_id,
        )
        return Response(
            {
                "dryRun": result.dry_run,
                "createdCount": result.created_count,
                "skippedCount": result.skipped_count,
                "warningCount": len(result.warnings),
                "items": [work_schedule_payload(item) for item in result.items],
                "warnings": result.warnings,
            }
        )


class WorkScheduleDetailView(APIView):
    def get(self, request, work_schedule_id):
        membership = AuthService.current_context(request.user).membership
        return Response(
            work_schedule_payload(get_work_schedule(membership, work_schedule_id))
        )

    def patch(self, request, work_schedule_id):
        membership = AuthService.current_context(request.user).membership
        serializer = WorkScheduleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule, warnings = WorkScheduleService.update(
            membership=membership,
            work_schedule_id=work_schedule_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        return Response({"item": work_schedule_payload(schedule), "warnings": warnings})

    def delete(self, request, work_schedule_id):
        membership = AuthService.current_context(request.user).membership
        WorkScheduleService.delete(
            membership=membership,
            work_schedule_id=work_schedule_id,
            expected_version=_required_version(request),
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CalendarEventsView(APIView):
    def get(self, request):
        from apps.work_records.models import WorkRecord

        membership = AuthService.current_context(request.user).membership
        serializer = CalendarQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        project_ids = _uuid_csv(values.get("projectIds"), "projectIds")
        user_ids = _uuid_csv(values.get("userIds"), "userIds")
        statuses = [value for value in values.get("status", "").split(",") if value]
        items = []

        if values["mode"] in ("planned", "both"):
            schedules = WorkSchedule.objects.for_organization(
                membership.organization
            ).filter(
                scheduled_start_at__lt=values["to"],
                scheduled_end_at__gt=values["from"],
            )
            if project_ids:
                schedules = schedules.filter(project_id__in=project_ids)
            if user_ids:
                schedules = schedules.filter(user_id__in=user_ids)
            if statuses:
                schedules = schedules.filter(status__in=statuses)
            items.extend(
                {
                    "id": str(item.id),
                    "type": "SCHEDULE",
                    "projectId": str(item.project_id),
                    "userId": str(item.user_id),
                    "title": item.title,
                    "startAt": item.scheduled_start_at.isoformat(),
                    "endAt": item.scheduled_end_at.isoformat(),
                    "status": item.status,
                    "isGenerated": item.is_generated,
                    "isManuallyOverridden": item.is_manually_overridden,
                    "sourceId": (
                        str(item.weekly_schedule_id)
                        if item.weekly_schedule_id
                        else None
                    ),
                    "version": item.version,
                }
                for item in schedules.order_by("scheduled_start_at", "id")
            )

        if values["mode"] in ("actual", "both"):
            records = (
                WorkRecord.objects.for_organization(membership.organization)
                .filter(
                    actual_start_at__lt=values["to"],
                    actual_end_at__gt=values["from"],
                )
                .select_related("project")
            )
            if project_ids:
                records = records.filter(project_id__in=project_ids)
            if user_ids:
                records = records.filter(user_id__in=user_ids)
            if statuses:
                records = records.filter(status__in=statuses)
            items.extend(
                {
                    "id": str(item.id),
                    "type": "WORK_RECORD",
                    "projectId": str(item.project_id),
                    "userId": str(item.user_id),
                    "title": item.project.name,
                    "startAt": item.actual_start_at.isoformat(),
                    "endAt": item.actual_end_at.isoformat(),
                    "status": item.status,
                    "isGenerated": False,
                    "isManuallyOverridden": False,
                    "sourceId": (
                        str(item.work_schedule_id) if item.work_schedule_id else None
                    ),
                    "version": item.version,
                }
                for item in records.order_by("actual_start_at", "id")
            )

        items.sort(key=lambda item: (item["startAt"], item["id"]))
        return Response({"items": items})
