"""Client application use cases."""

from __future__ import annotations

import logging
import uuid

from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from apps.audit_logs.services import AuditLogService
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
from apps.files.tasks import delete_stored_file, process_client_icon
from apps.organizations.models import OrganizationRole

from ..domain.icon import generate_default_icon, icon_text
from ..models import Client, IconStatus, IconType

logger = logging.getLogger(__name__)


class ClientNotFoundError(ResourceNotFoundError):
    code = "CLIENT_NOT_FOUND"
    default_message = "クライアントが見つかりません。"


class ClientNameConflictError(ConflictError):
    code = "CLIENT_NAME_ALREADY_EXISTS"
    default_message = "同じ名前のクライアントが既に存在します。"


def require_client_editor(membership) -> None:
    if membership.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        raise AuthorizationError()


def get_client(membership, client_id) -> Client:
    client = (
        Client.objects.for_organization(membership.organization)
        .select_related("icon_file")
        .filter(pk=client_id)
        .first()
    )
    if client is None:
        raise ClientNotFoundError()
    return client


def _store_icon(upload, *, organization, client_id, user) -> StoredFile:
    validated = validate_image(upload)
    file_id = uuid.uuid4()
    key = (
        f"organizations/{organization.id}/clients/{client_id}/icons/"
        f"original/{file_id}.{validated.extension}"
    )
    saved_key = save_original(upload, key)
    try:
        return StoredFile.objects.create(
            id=file_id,
            organization=organization,
            category=FileCategory.CLIENT_ICON,
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
            process_client_icon.delay(str(task.id))
            if task.task_type == BackgroundTaskType.IMAGE_PROCESSING
            else delete_stored_file.delay(str(task.id))
        )
        BackgroundTask.objects.filter(pk=task.id).update(celery_task_id=celery_task.id)

    transaction.on_commit(callback, robust=True)


def _image_task(*, client, stored_file, old_file=None) -> BackgroundTask:
    task = BackgroundTask.objects.create(
        organization=client.organization,
        task_type=BackgroundTaskType.IMAGE_PROCESSING,
        resource_type="STORED_FILE",
        resource_id=stored_file.id,
        result={"oldFileId": str(old_file.id)} if old_file else None,
    )
    _enqueue(task)
    return task


def _delete_task(*, client, stored_file) -> BackgroundTask:
    task = BackgroundTask.objects.create(
        organization=client.organization,
        task_type=BackgroundTaskType.FILE_DELETE,
        resource_type="STORED_FILE",
        resource_id=stored_file.id,
    )
    _enqueue(task)
    return task


class ClientService:
    @staticmethod
    @transaction.atomic
    def create(*, membership, data, icon_file=None, trace_id=None) -> Client:
        require_client_editor(membership)
        organization = membership.organization
        if (
            Client.objects.for_organization(organization)
            .filter(name=data["name"])
            .exists()
        ):
            raise ClientNameConflictError()

        client = Client(
            id=uuid.uuid4(),
            organization=organization,
            created_by=membership.user,
            updated_by=membership.user,
            **data,
        )
        default_icon = generate_default_icon(client.name, client.id)
        client.default_icon_text = default_icon.text
        client.default_icon_background_color = default_icon.background_color
        client.default_icon_text_color = default_icon.text_color
        if icon_file:
            stored_file = _store_icon(
                icon_file,
                organization=organization,
                client_id=client.id,
                user=membership.user,
            )
            client.icon_type = IconType.UPLOADED
            client.icon_status = IconStatus.PENDING
            client.icon_file = stored_file
            client.icon_updated_at = timezone.now()
        client.save()
        if icon_file:
            _image_task(client=client, stored_file=client.icon_file)
        AuditLogService.record(
            organization=organization,
            actor_user=membership.user,
            action="CLIENT_CREATED",
            resource_type="client",
            resource_id=client.id,
            after={"name": client.name, "status": client.status},
            trace_id=trace_id,
        )
        return client

    @staticmethod
    @transaction.atomic
    def update(
        *,
        membership,
        client_id,
        expected_version,
        data,
        icon_file=None,
        icon_action="KEEP",
        trace_id=None,
    ) -> Client:
        require_client_editor(membership)
        client = (
            Client.objects.for_organization(membership.organization)
            .select_for_update(of=("self",))
            .select_related("icon_file")
            .filter(pk=client_id)
            .first()
        )
        if client is None:
            raise ClientNotFoundError()
        if client.version != expected_version:
            raise ConcurrentModificationError(expected_version, client.version)
        if (
            data["name"] != client.name
            and Client.objects.for_organization(membership.organization)
            .filter(name=data["name"])
            .exclude(pk=client.id)
            .exists()
        ):
            raise ClientNameConflictError()

        before = {
            "name": client.name,
            "status": client.status,
            "version": client.version,
        }
        old_file = client.icon_file
        old_name = client.name
        for field, value in data.items():
            setattr(client, field, value)
        if client.name != old_name and client.icon_type == IconType.DEFAULT:
            client.default_icon_text = icon_text(client.name)

        if icon_file:
            stored_file = _store_icon(
                icon_file,
                organization=client.organization,
                client_id=client.id,
                user=membership.user,
            )
            client.icon_type = IconType.UPLOADED
            client.icon_status = IconStatus.PENDING
            client.icon_file = stored_file
            client.icon_updated_at = timezone.now()
        elif icon_action == "DELETE" and old_file:
            client.icon_type = IconType.DEFAULT
            client.icon_status = IconStatus.READY
            client.icon_file = None
            client.icon_updated_at = timezone.now()

        client.updated_by = membership.user
        client.advance_version()
        client.save()
        if icon_file:
            _image_task(client=client, stored_file=client.icon_file, old_file=old_file)
        elif icon_action == "DELETE" and old_file:
            _delete_task(client=client, stored_file=old_file)
        AuditLogService.record(
            organization=client.organization,
            actor_user=membership.user,
            action="CLIENT_UPDATED",
            resource_type="client",
            resource_id=client.id,
            before=before,
            after={
                "name": client.name,
                "status": client.status,
                "version": client.version,
            },
            trace_id=trace_id,
        )
        return client

    @staticmethod
    @transaction.atomic
    def delete(*, membership, client_id, expected_version, trace_id=None) -> None:
        require_client_editor(membership)
        client = (
            Client.objects.for_organization(membership.organization)
            .select_for_update()
            .filter(pk=client_id)
            .first()
        )
        if client is None:
            raise ClientNotFoundError()
        if client.version != expected_version:
            raise ConcurrentModificationError(expected_version, client.version)
        client.delete()
        AuditLogService.record(
            organization=membership.organization,
            actor_user=membership.user,
            action="CLIENT_DELETED",
            resource_type="client",
            resource_id=client.id,
            trace_id=trace_id,
        )
