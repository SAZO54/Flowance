from __future__ import annotations

import io
import logging

from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageOps

from .models import (
    BackgroundTask,
    BackgroundTaskStatus,
    FileStatus,
    StoredFile,
)

logger = logging.getLogger(__name__)


def _delete_file_objects(stored_file: StoredFile) -> None:
    for key in (stored_file.original_object_key, stored_file.processed_object_key):
        if key and default_storage.exists(key):
            default_storage.delete(key)
    stored_file.status = FileStatus.DELETED
    stored_file.deleted_at = timezone.now()
    stored_file.save(update_fields=["status", "deleted_at", "updated_at"])


@shared_task
def process_client_icon(background_task_id: str) -> None:
    from apps.clients.models import Client, IconStatus

    task = BackgroundTask.objects.select_related("organization").get(
        pk=background_task_id
    )
    task.status = BackgroundTaskStatus.PROCESSING
    task.progress = 10
    task.started_at = timezone.now()
    task.save(update_fields=["status", "progress", "started_at", "updated_at"])
    stored_file = StoredFile.all_objects.get(pk=task.resource_id)
    stored_file.status = FileStatus.PROCESSING
    stored_file.save(update_fields=["status", "updated_at"])

    try:
        with default_storage.open(stored_file.original_object_key, "rb") as source:
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA")
                side = min(image.size)
                left = (image.width - side) // 2
                top = (image.height - side) // 2
                image = image.crop((left, top, left + side, top + side))
                image = image.resize((256, 256), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=85, method=6)

        processed_key = (
            stored_file.original_object_key.replace("/original/", "/processed/").rsplit(
                ".", 1
            )[0]
            + ".webp"
        )
        default_storage.save(processed_key, ContentFile(output.getvalue()))

        with transaction.atomic():
            stored_file.processed_object_key = processed_key
            stored_file.width = 256
            stored_file.height = 256
            stored_file.status = FileStatus.READY
            stored_file.save(
                update_fields=[
                    "processed_object_key",
                    "width",
                    "height",
                    "status",
                    "updated_at",
                ]
            )
            Client.all_objects.filter(
                icon_file_id=stored_file.id,
                deleted_at__isnull=True,
            ).update(icon_status=IconStatus.READY, icon_updated_at=timezone.now())
            task.status = BackgroundTaskStatus.SUCCEEDED
            task.progress = 100
            task.finished_at = timezone.now()
            task.save(update_fields=["status", "progress", "finished_at", "updated_at"])

        old_file_id = (task.result or {}).get("oldFileId")
        if old_file_id:
            old_file = StoredFile.all_objects.filter(pk=old_file_id).first()
            if old_file:
                _delete_file_objects(old_file)
    except Exception:
        logger.exception(
            "Client icon processing failed", extra={"task_id": str(task.id)}
        )
        stored_file.status = FileStatus.FAILED
        stored_file.error_code = "IMAGE_PROCESSING_FAILED"
        stored_file.error_message = "画像変換に失敗しました。"
        stored_file.save(
            update_fields=["status", "error_code", "error_message", "updated_at"]
        )
        Client.all_objects.filter(icon_file_id=stored_file.id).update(
            icon_status=IconStatus.FAILED
        )
        task.status = BackgroundTaskStatus.FAILED
        task.error_code = "IMAGE_PROCESSING_FAILED"
        task.error_message = "画像変換に失敗しました。"
        task.finished_at = timezone.now()
        task.save(
            update_fields=[
                "status",
                "error_code",
                "error_message",
                "finished_at",
                "updated_at",
            ]
        )


@shared_task
def delete_stored_file(background_task_id: str) -> None:
    task = BackgroundTask.objects.get(pk=background_task_id)
    task.status = BackgroundTaskStatus.PROCESSING
    task.started_at = timezone.now()
    task.save(update_fields=["status", "started_at", "updated_at"])
    stored_file = StoredFile.all_objects.filter(pk=task.resource_id).first()
    if stored_file:
        _delete_file_objects(stored_file)
    task.status = BackgroundTaskStatus.SUCCEEDED
    task.progress = 100
    task.finished_at = timezone.now()
    task.save(update_fields=["status", "progress", "finished_at", "updated_at"])


@shared_task
def process_project_icon(background_task_id: str) -> None:
    from apps.projects.models import Project, ProjectIconStatus

    task = BackgroundTask.objects.select_related("organization").get(
        pk=background_task_id
    )
    task.status = BackgroundTaskStatus.PROCESSING
    task.progress = 10
    task.started_at = timezone.now()
    task.save(update_fields=["status", "progress", "started_at", "updated_at"])
    stored_file = StoredFile.all_objects.get(pk=task.resource_id)
    stored_file.status = FileStatus.PROCESSING
    stored_file.save(update_fields=["status", "updated_at"])

    try:
        with default_storage.open(stored_file.original_object_key, "rb") as source:
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA")
                side = min(image.size)
                left = (image.width - side) // 2
                top = (image.height - side) // 2
                image = image.crop((left, top, left + side, top + side))
                image = image.resize((256, 256), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=85, method=6)

        processed_key = (
            stored_file.original_object_key.replace("/original/", "/processed/").rsplit(
                ".", 1
            )[0]
            + ".webp"
        )
        default_storage.save(processed_key, ContentFile(output.getvalue()))

        with transaction.atomic():
            stored_file.processed_object_key = processed_key
            stored_file.width = 256
            stored_file.height = 256
            stored_file.status = FileStatus.READY
            stored_file.save(
                update_fields=[
                    "processed_object_key",
                    "width",
                    "height",
                    "status",
                    "updated_at",
                ]
            )
            Project.all_objects.filter(
                icon_file_id=stored_file.id,
                deleted_at__isnull=True,
            ).update(
                icon_status=ProjectIconStatus.READY,
                icon_updated_at=timezone.now(),
            )
            task.status = BackgroundTaskStatus.SUCCEEDED
            task.progress = 100
            task.finished_at = timezone.now()
            task.save(update_fields=["status", "progress", "finished_at", "updated_at"])

        old_file_id = (task.result or {}).get("oldFileId")
        if old_file_id:
            old_file = StoredFile.all_objects.filter(pk=old_file_id).first()
            if old_file:
                _delete_file_objects(old_file)
    except Exception:
        logger.exception(
            "Project icon processing failed", extra={"task_id": str(task.id)}
        )
        stored_file.status = FileStatus.FAILED
        stored_file.error_code = "IMAGE_PROCESSING_FAILED"
        stored_file.error_message = "画像変換に失敗しました。"
        stored_file.save(
            update_fields=["status", "error_code", "error_message", "updated_at"]
        )
        Project.all_objects.filter(icon_file_id=stored_file.id).update(
            icon_status=ProjectIconStatus.FAILED
        )
        task.status = BackgroundTaskStatus.FAILED
        task.error_code = "IMAGE_PROCESSING_FAILED"
        task.error_message = "画像変換に失敗しました。"
        task.finished_at = timezone.now()
        task.save(
            update_fields=[
                "status",
                "error_code",
                "error_message",
                "finished_at",
                "updated_at",
            ]
        )
