from math import ceil

from django.core.files.storage import default_storage
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService

from ..application.services import ProjectService, get_project
from ..models import Project, ProjectIconStatus
from .serializers import (
    ProjectListQuerySerializer,
    ProjectUpdateSerializer,
    ProjectWriteSerializer,
)


def _icon_payload(project):
    url = None
    if (
        project.icon_status == ProjectIconStatus.READY
        and project.icon_file
        and project.icon_file.processed_object_key
    ):
        url = default_storage.url(project.icon_file.processed_object_key)
    return {
        "type": project.icon_type,
        "status": project.icon_status,
        "url": url,
        "defaultText": project.default_icon_text,
        "backgroundColor": project.default_icon_background_color,
        "textColor": project.default_icon_text_color,
    }


def _member_payload(member):
    return {
        "id": str(member.id),
        "userId": str(member.user_id),
        "displayName": member.user.display_name,
        "role": member.role,
        "canView": member.can_view,
        "canEditSchedule": member.can_edit_schedule,
        "canEditWorkRecord": member.can_edit_work_record,
    }


def project_payload(project):
    members = project.members.select_related("user").order_by("created_at")
    return {
        "id": str(project.id),
        "client": {
            "id": str(project.client_id),
            "name": project.client.name,
        },
        "name": project.name,
        "description": project.description,
        "labelColor": project.label_color,
        "startDate": project.start_date.isoformat() if project.start_date else None,
        "endDate": project.end_date.isoformat() if project.end_date else None,
        "workloadRate": (
            float(project.workload_rate) if project.workload_rate is not None else None
        ),
        "status": project.status,
        "notes": project.notes,
        "icon": _icon_payload(project),
        "members": [_member_payload(member) for member in members],
        "version": project.version,
        "createdAt": project.created_at.isoformat(),
        "updatedAt": project.updated_at.isoformat(),
    }


class ProjectCollectionView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        membership = AuthService.current_context(request.user).membership
        query = ProjectListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        values = query.validated_data
        queryset = (
            Project.objects.for_organization(membership.organization)
            .select_related("client", "icon_file")
            .prefetch_related("members__user")
        )
        if values.get("query"):
            term = values["query"]
            queryset = queryset.filter(
                Q(name__icontains=term) | Q(client__name__icontains=term)
            )
        if values.get("status"):
            queryset = queryset.filter(status=values["status"])
        ordering = {
            "name": "name",
            "-name": "-name",
            "updatedAt": "updated_at",
            "-updatedAt": "-updated_at",
            "revenue": "name",
            "-revenue": "-name",
        }[values["sort"]]
        queryset = queryset.order_by(ordering, "id")
        total = queryset.count()
        page, page_size = values["page"], values["pageSize"]
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        total_pages = ceil(total / page_size) if total else 0
        return Response(
            {
                "items": [project_payload(project) for project in items],
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
        serializer = ProjectWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = ProjectService.create(
            membership=membership,
            data=serializer.model_data(),
            icon_file=serializer.validated_data.get("iconFile"),
            trace_id=request.trace_id,
        )
        response = Response(project_payload(project), status=status.HTTP_201_CREATED)
        response["Location"] = f"/api/v1/projects/{project.id}"
        return response


class ProjectDetailView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        return Response(project_payload(get_project(membership, project_id)))

    def patch(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        serializer = ProjectUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = ProjectService.update(
            membership=membership,
            project_id=project_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            icon_file=serializer.validated_data.get("iconFile"),
            icon_action=serializer.validated_data.get("iconAction", "KEEP"),
            trace_id=request.trace_id,
        )
        return Response(project_payload(project))

    def delete(self, request, project_id):
        membership = AuthService.current_context(request.user).membership
        try:
            version = int(request.query_params.get("version", ""))
        except ValueError as exc:
            raise ValidationError({"version": "versionは必須です。"}) from exc
        if version < 1:
            raise ValidationError({"version": "versionは1以上で指定してください。"})
        ProjectService.delete(
            membership=membership,
            project_id=project_id,
            expected_version=version,
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
