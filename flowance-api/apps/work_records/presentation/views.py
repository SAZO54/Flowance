from math import ceil

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService

from ..application.services import WorkRecordService, get_work_record
from ..models import WorkRecord
from .serializers import (
    WorkRecordListQuerySerializer,
    WorkRecordUpdateSerializer,
    WorkRecordWriteSerializer,
)


def work_record_payload(record):
    return {
        "id": str(record.id),
        "projectId": str(record.project_id),
        "userId": str(record.user_id),
        "workScheduleId": (
            str(record.work_schedule_id) if record.work_schedule_id else None
        ),
        "actualStartAt": record.actual_start_at.isoformat(),
        "actualEndAt": record.actual_end_at.isoformat(),
        "actualMinutes": record.actual_minutes,
        "breakMinutes": record.break_minutes,
        "billableMinutes": record.billable_minutes,
        "isBillable": record.is_billable,
        "status": record.status,
        "notes": record.notes,
        "breaks": [
            {
                "id": str(item.id),
                "startAt": item.start_at.isoformat(),
                "endAt": item.end_at.isoformat(),
                "breakMinutes": item.break_minutes,
                "sortOrder": item.sort_order,
            }
            for item in record.breaks.all()
        ],
        "version": record.version,
        "createdAt": record.created_at.isoformat(),
        "updatedAt": record.updated_at.isoformat(),
    }


def _required_version(request):
    try:
        version = int(request.query_params.get("version", ""))
    except ValueError as exc:
        raise ValidationError({"version": "versionは必須です。"}) from exc
    if version < 1:
        raise ValidationError({"version": "versionは1以上で指定してください。"})
    return version


class WorkRecordCollectionView(APIView):
    def get(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = WorkRecordListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        queryset = (
            WorkRecord.objects.for_organization(membership.organization)
            .select_related("project", "user", "work_schedule")
            .prefetch_related("breaks")
        )
        if values.get("from"):
            queryset = queryset.filter(actual_end_at__gt=values["from"])
        if values.get("to"):
            queryset = queryset.filter(actual_start_at__lt=values["to"])
        if values.get("projectId"):
            queryset = queryset.filter(project_id=values["projectId"])
        if values.get("status"):
            queryset = queryset.filter(status=values["status"])
        queryset = queryset.order_by("-actual_start_at", "id")
        total = queryset.count()
        page, page_size = values["page"], values["pageSize"]
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        total_pages = ceil(total / page_size) if total else 0
        return Response(
            {
                "items": [work_record_payload(item) for item in items],
                "pagination": {
                    "page": page,
                    "pageSize": page_size,
                    "totalItems": total,
                    "totalPages": total_pages,
                    "hasNext": page < total_pages,
                    "hasPrevious": page > 1,
                },
            }
        )

    def post(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = WorkRecordWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = WorkRecordService.create(
            membership=membership,
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        response = Response(work_record_payload(record), status=status.HTTP_201_CREATED)
        response["Location"] = f"/api/v1/work-records/{record.id}"
        return response


class WorkRecordDetailView(APIView):
    def get(self, request, record_id):
        membership = AuthService.current_context(request.user).membership
        return Response(work_record_payload(get_work_record(membership, record_id)))

    def patch(self, request, record_id):
        membership = AuthService.current_context(request.user).membership
        serializer = WorkRecordUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = WorkRecordService.update(
            membership=membership,
            record_id=record_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            trace_id=request.trace_id,
        )
        return Response(work_record_payload(record))

    def delete(self, request, record_id):
        membership = AuthService.current_context(request.user).membership
        WorkRecordService.delete(
            membership=membership,
            record_id=record_id,
            expected_version=_required_version(request),
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
