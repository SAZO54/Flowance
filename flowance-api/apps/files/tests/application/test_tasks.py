from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase
from PIL import Image

from apps.clients.models import IconStatus, IconType
from apps.common.tests.factories import ClientFactory, OrganizationMemberFactory
from apps.files.image_validation import UnsupportedImageTypeError, validate_image
from apps.files.models import (
    BackgroundTask,
    BackgroundTaskStatus,
    BackgroundTaskType,
    FileCategory,
    FileStatus,
    StoredFile,
)
from apps.files.tasks import delete_stored_file, process_client_icon


def image_bytes(*, image_format="JPEG", size=(320, 240), exif=None) -> bytes:
    image = Image.new("RGB", size, "#75A8C7")
    output = BytesIO()
    kwargs = {"format": image_format}
    if exif is not None:
        kwargs["exif"] = exif
    image.save(output, **kwargs)
    return output.getvalue()


class NamedContentFile(ContentFile):
    def __init__(self, content, *, name, content_type):
        super().__init__(content, name=name)
        self.content_type = content_type
        self.size = len(content)


class FileTaskTests(TestCase):
    def setUp(self):
        self.membership = OrganizationMemberFactory()
        self.organization = self.membership.organization
        self.user = self.membership.user
        self.keys: list[str] = []

    def tearDown(self):
        for key in self.keys:
            if default_storage.exists(key):
                default_storage.delete(key)

    def save_original(self, key: str, content: bytes) -> str:
        self.keys.append(key)
        if default_storage.exists(key):
            default_storage.delete(key)
        return default_storage.save(key, ContentFile(content))

    def stored_file(self, *, key: str, content: bytes) -> StoredFile:
        saved_key = self.save_original(key, content)
        return StoredFile.objects.create(
            organization=self.organization,
            category=FileCategory.CLIENT_ICON,
            status=FileStatus.PENDING,
            storage_provider="LOCAL",
            original_object_key=saved_key,
            original_filename="icon.jpg",
            content_type="image/jpeg",
            file_size_bytes=len(content),
            created_by=self.user,
        )

    def background_task(self, stored_file: StoredFile) -> BackgroundTask:
        return BackgroundTask.objects.create(
            organization=self.organization,
            task_type=BackgroundTaskType.IMAGE_PROCESSING,
            resource_type="stored_file",
            resource_id=stored_file.id,
            status=BackgroundTaskStatus.PENDING,
        )

    def test_validate_image_rejects_svg_upload(self):
        upload = NamedContentFile(
            b"<svg></svg>",
            name="icon.svg",
            content_type="image/svg+xml",
        )

        with self.assertRaises(UnsupportedImageTypeError):
            validate_image(upload)

    def test_process_client_icon_creates_square_webp_without_exif(self):
        exif = Image.Exif()
        exif[274] = 6
        stored_file = self.stored_file(
            key="tests/original/client-icon.jpg",
            content=image_bytes(exif=exif),
        )
        client = ClientFactory(
            organization=self.organization,
            created_by=self.user,
            updated_by=self.user,
            icon_type=IconType.UPLOADED,
            icon_status=IconStatus.PENDING,
            icon_file=stored_file,
        )
        task = self.background_task(stored_file)

        process_client_icon.run(str(task.id))

        stored_file.refresh_from_db()
        client.refresh_from_db()
        task.refresh_from_db()
        self.keys.append(stored_file.processed_object_key)
        self.assertEqual(stored_file.status, FileStatus.READY)
        self.assertEqual(stored_file.width, 256)
        self.assertEqual(stored_file.height, 256)
        self.assertTrue(stored_file.processed_object_key.endswith(".webp"))
        self.assertEqual(client.icon_status, IconStatus.READY)
        self.assertEqual(task.status, BackgroundTaskStatus.SUCCEEDED)
        with default_storage.open(stored_file.processed_object_key, "rb") as processed:
            with Image.open(processed) as image:
                self.assertEqual(image.format, "WEBP")
                self.assertEqual(image.size, (256, 256))
                self.assertNotIn("exif", image.info)

    def test_process_client_icon_failure_marks_file_client_and_task_failed(self):
        stored_file = self.stored_file(
            key="tests/original/broken-client-icon.jpg",
            content=b"not an image",
        )
        client = ClientFactory(
            organization=self.organization,
            created_by=self.user,
            updated_by=self.user,
            icon_type=IconType.UPLOADED,
            icon_status=IconStatus.PENDING,
            icon_file=stored_file,
        )
        task = self.background_task(stored_file)

        process_client_icon.run(str(task.id))

        stored_file.refresh_from_db()
        client.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(stored_file.status, FileStatus.FAILED)
        self.assertEqual(stored_file.error_code, "IMAGE_PROCESSING_FAILED")
        self.assertEqual(client.icon_status, IconStatus.FAILED)
        self.assertEqual(task.status, BackgroundTaskStatus.FAILED)
        self.assertEqual(task.retry_count, 0)

    def test_delete_stored_file_deletes_objects_and_marks_task_succeeded(self):
        stored_file = self.stored_file(
            key="tests/original/delete-me.jpg",
            content=image_bytes(),
        )
        task = BackgroundTask.objects.create(
            organization=self.organization,
            task_type=BackgroundTaskType.FILE_DELETE,
            resource_type="stored_file",
            resource_id=stored_file.id,
            status=BackgroundTaskStatus.PENDING,
        )

        delete_stored_file.run(str(task.id))

        stored_file.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(stored_file.status, FileStatus.DELETED)
        self.assertFalse(default_storage.exists(stored_file.original_object_key))
        self.assertEqual(task.status, BackgroundTaskStatus.SUCCEEDED)
        self.assertEqual(task.progress, 100)
