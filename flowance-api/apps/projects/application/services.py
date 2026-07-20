"""Project application use cases."""

from __future__ import annotations

import logging
import uuid

from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from apps.audit_logs.services import AuditLogService
from apps.clients.models import Client
from apps.common.exceptions import (
    AuthorizationError,
    ConcurrentModificationError,
    ConflictError,
    ResourceNotFoundError,
)
from apps.files.image_validation import save_original, validate_image
from apps.files.models import (
    BackgroundTask,
    BackgroundTaskType,
    FileCategory,
    StoredFile,
)
from apps.files.tasks import delete_stored_file, process_project_icon
from apps.organizations.models import OrganizationRole

from ..domain.icon import generate_default_icon
from ..models import (
    Project,
    ProjectIconStatus,
    ProjectIconType,
    ProjectMember,
    ProjectMemberRole,
)

logger = logging.getLogger(__name__)


class ProjectNotFoundError(ResourceNotFoundError):
    code = "PROJECT_NOT_FOUND"
    default_message = "案件が見つかりません。"


class ProjectClientNotFoundError(ResourceNotFoundError):
    code = "CLIENT_NOT_FOUND"
    default_message = "クライアントが見つかりません。"


class ProjectNameConflictError(ConflictError):
    code = "PROJECT_NAME_ALREADY_EXISTS"
    default_message = "同じクライアントに同名の案件が既に存在します。"


def require_project_editor(membership) -> None:
    if membership.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        raise AuthorizationError()


def get_project(membership, project_id) -> Project:
    project = (
        Project.objects.for_organization(membership.organization)
        .select_related("client", "icon_file")
        .filter(pk=project_id)
        .first()
    )
    if project is None:
        raise ProjectNotFoundError()
    return project


def _get_client(membership, client_id) -> Client:
    client = (
        Client.objects.for_organization(membership.organization)
        .filter(pk=client_id)
        .first()
    )
    if client is None:
        raise ProjectClientNotFoundError()
    return client


def _store_icon(upload, *, organization, project_id, user) -> StoredFile:
    validated = validate_image(upload)
    file_id = uuid.uuid4()
    key = (
        f"organizations/{organization.id}/projects/{project_id}/icons/"
        f"original/{file_id}.{validated.extension}"
    )
    saved_key = save_original(upload, key)
    try:
        return StoredFile.objects.create(
            id=file_id,
            organization=organization,
            category=FileCategory.PROJECT_ICON,
            original_object_key=saved_key,
            original_filename=upload.name[:255],
            content_type=validated.content_type,
            file_size_bytes=validated.size,
            checksum_sha256=validated.checksum,
            created_by=user,
        )
    except Exception:
        default_storage.delete(saved_key)
        raise


def _enqueue(task: BackgroundTask) -> None:
    def callback():
        celery_task = (
            process_project_icon.delay(str(task.id))
            if task.task_type == BackgroundTaskType.IMAGE_PROCESSING
            else delete_stored_file.delay(str(task.id))
        )
        BackgroundTask.objects.filter(pk=task.id).update(celery_task_id=celery_task.id)

    transaction.on_commit(callback, robust=True)


def _image_task(*, project, stored_file, old_file=None) -> BackgroundTask:
    task = BackgroundTask.objects.create(
        organization=project.organization,
        task_type=BackgroundTaskType.IMAGE_PROCESSING,
        resource_type="STORED_FILE",
        resource_id=stored_file.id,
        result={"oldFileId": str(old_file.id)} if old_file else None,
    )
    _enqueue(task)
    return task


def _delete_task(*, project, stored_file) -> BackgroundTask:
    task = BackgroundTask.objects.create(
        organization=project.organization,
        task_type=BackgroundTaskType.FILE_DELETE,
        resource_type="STORED_FILE",
        resource_id=stored_file.id,
    )
    _enqueue(task)
    return task


class ProjectService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, data, icon_file=None, trace_id=None) -> Project:
        require_project_editor(membership)
        organization = membership.organization
        client = _get_client(membership, data.pop("client_id"))
        if (
            Project.objects.for_organization(organization)
            .filter(client=client, name=data["name"])
            .exists()
        ):
            raise ProjectNameConflictError()

        project = Project(
            id=uuid.uuid4(),
            organization=organization,
            client=client,
            created_by=membership.user,
            updated_by=membership.user,
            **data,
        )
        default_icon = generate_default_icon(project.id)
        project.default_icon_text = default_icon.text
        project.default_icon_background_color = default_icon.background_color
        project.default_icon_text_color = default_icon.text_color
        if icon_file:
            stored_file = _store_icon(
                icon_file,
                organization=organization,
                project_id=project.id,
                user=membership.user,
            )
            project.icon_type = ProjectIconType.UPLOADED
            project.icon_status = ProjectIconStatus.PENDING
            project.icon_file = stored_file
            project.icon_updated_at = timezone.now()
        project.save()
        ProjectMember.objects.create(
            organization=organization,
            project=project,
            user=membership.user,
            role=ProjectMemberRole.MANAGER,
            can_view=True,
            can_edit_schedule=True,
            can_edit_work_record=True,
        )
        if icon_file:
            _image_task(project=project, stored_file=project.icon_file)
        AuditLogService.record(
            organization=organization,
            actor_user=membership.user,
            action="PROJECT_CREATED",
            resource_type="project",
            resource_id=project.id,
            after={
                "clientId": str(project.client_id),
                "name": project.name,
                "status": project.status,
            },
            trace_id=trace_id,
        )
        return project

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        project_id,
        expected_version,
        data,
        icon_file=None,
        icon_action="KEEP",
        trace_id=None,
    ) -> Project:
        require_project_editor(membership)
        project = (
            Project.objects.for_organization(membership.organization)
            .select_for_update(of=("self",))
            .select_related("client", "icon_file")
            .filter(pk=project_id)
            .first()
        )
        if project is None:
            raise ProjectNotFoundError()
        if project.version != expected_version:
            raise ConcurrentModificationError(expected_version, project.version)

        client = _get_client(membership, data.pop("client_id"))
        if (
            Project.objects.for_organization(membership.organization)
            .filter(client=client, name=data["name"])
            .exclude(pk=project.id)
            .exists()
        ):
            raise ProjectNameConflictError()

        before = {
            "clientId": str(project.client_id),
            "name": project.name,
            "status": project.status,
            "version": project.version,
        }
        old_file = project.icon_file
        project.client = client
        for field, value in data.items():
            setattr(project, field, value)

        if icon_file:
            stored_file = _store_icon(
                icon_file,
                organization=project.organization,
                project_id=project.id,
                user=membership.user,
            )
            project.icon_type = ProjectIconType.UPLOADED
            project.icon_status = ProjectIconStatus.PENDING
            project.icon_file = stored_file
            project.icon_updated_at = timezone.now()
        elif icon_action == "DELETE" and old_file:
            project.icon_type = ProjectIconType.DEFAULT
            project.icon_status = ProjectIconStatus.READY
            project.icon_file = None
            project.icon_updated_at = timezone.now()

        project.updated_by = membership.user
        project.advance_version()
        project.save()
        if icon_file:
            _image_task(
                project=project, stored_file=project.icon_file, old_file=old_file
            )
        elif icon_action == "DELETE" and old_file:
            _delete_task(project=project, stored_file=old_file)
        AuditLogService.record(
            organization=project.organization,
            actor_user=membership.user,
            action="PROJECT_UPDATED",
            resource_type="project",
            resource_id=project.id,
            before=before,
            after={
                "clientId": str(project.client_id),
                "name": project.name,
                "status": project.status,
                "version": project.version,
            },
            trace_id=trace_id,
        )
        return project

    @staticmethod
    @transaction.atomic
    def delete(*, membership, project_id, expected_version, trace_id=None) -> None:
        require_project_editor(membership)
        project = (
            Project.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(pk=project_id)
            .first()
        )
        if project is None:
            raise ProjectNotFoundError()
        if project.version != expected_version:
            raise ConcurrentModificationError(expected_version, project.version)
        project.delete()
        ProjectMember.objects.for_organization(membership.organization).filter(
            project=project
        ).delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="PROJECT_DELETED",
            resource_type="project",
            resource_id=project.id,
            trace_id=trace_id,
        )
