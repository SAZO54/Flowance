import io
import tempfile
from types import SimpleNamespace
from unittest.mock import patch
from uuid import UUID

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from apps.files.models import BackgroundTask, FileStatus, StoredFile
from apps.files.tasks import process_client_icon

from .domain.icon import generate_default_icon
from .models import Client, IconStatus, IconType


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ClientAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.csrf = self.client.cookies["csrftoken"].value
        self.headers = {"HTTP_X_CSRFTOKEN": self.csrf}

    def test_urls_follow_openapi_paths(self):
        client_id = "390fd998-2609-4a3c-8c3a-2e299d407f7c"
        self.assertEqual(reverse("clients:collection"), "/api/v1/clients")
        self.assertEqual(
            reverse("clients:detail", args=[client_id]), f"/api/v1/clients/{client_id}"
        )

    def create_client(self, **overrides):
        payload = {
            "name": "Nova Works",
            "status": "ACTIVE",
            "contactName": "Nova Owner",
            **overrides,
        }
        return self.client.post(
            reverse("clients:collection"),
            payload,
            format="json",
            **self.headers,
        )

    def test_create_list_detail_and_update_with_optimistic_lock(self):
        created = self.create_client()

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["icon"]["type"], "DEFAULT")
        client_id = created.data["id"]
        expected_icon = generate_default_icon(UUID(client_id))
        self.assertEqual(created.data["icon"]["defaultText"], expected_icon.text)
        self.assertEqual(
            created.data["icon"]["backgroundColor"], expected_icon.background_color
        )

        listed = self.client.get(reverse("clients:collection"))
        detailed = self.client.get(reverse("clients:detail", args=[client_id]))
        self.assertEqual(listed.data["pagination"]["totalItems"], 1)
        self.assertEqual(detailed.data["name"], "Nova Works")

        updated = self.client.patch(
            reverse("clients:detail", args=[client_id]),
            {
                "name": "Nova Studio",
                "status": "INACTIVE",
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["version"], 2)
        self.assertEqual(updated.data["icon"]["defaultText"], expected_icon.text)
        self.assertEqual(
            updated.data["icon"]["backgroundColor"], expected_icon.background_color
        )

        conflict = self.client.patch(
            reverse("clients:detail", args=[client_id]),
            {
                "name": "Stale Update",
                "status": "ACTIVE",
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.data["code"], "CONCURRENT_MODIFICATION")

    @staticmethod
    def image_upload():
        output = io.BytesIO()
        Image.new("RGB", (320, 200), "#336699").save(output, format="PNG")
        return SimpleUploadedFile(
            "client.png", output.getvalue(), content_type="image/png"
        )

    @patch("apps.clients.application.services.process_client_icon.delay")
    def test_icon_upload_processing_and_delete(self, delay):
        delay.return_value = SimpleNamespace(id="celery-test-id")
        with self.captureOnCommitCallbacks(execute=True):
            created = self.client.post(
                reverse("clients:collection"),
                {
                    "name": "Icon Client",
                    "status": "ACTIVE",
                    "iconFile": self.image_upload(),
                },
                format="multipart",
                **self.headers,
            )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["icon"]["status"], "PENDING")
        task = BackgroundTask.objects.get(task_type="IMAGE_PROCESSING")
        process_client_icon.run(str(task.id))

        client = Client.objects.get(pk=created.data["id"])
        stored_file = StoredFile.objects.get(pk=client.icon_file_id)
        self.assertEqual(client.icon_status, IconStatus.READY)
        self.assertEqual(stored_file.status, FileStatus.READY)
        self.assertTrue(stored_file.processed_object_key.endswith(".webp"))

        with (
            patch(
                "apps.clients.application.services.delete_stored_file.delay",
                return_value=SimpleNamespace(id="delete-test-id"),
            ),
            self.captureOnCommitCallbacks(execute=True),
        ):
            deleted = self.client.patch(
                reverse("clients:detail", args=[client.id]),
                {
                    "name": client.name,
                    "status": client.status,
                    "version": client.version,
                    "iconAction": "DELETE",
                },
                format="json",
                **self.headers,
            )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.data["icon"]["type"], IconType.DEFAULT)
        expected_icon = generate_default_icon(client.id)
        self.assertEqual(deleted.data["icon"]["defaultText"], expected_icon.text)
        self.assertIsNone(Client.objects.get(pk=client.id).icon_file_id)

    def test_cross_tenant_client_is_hidden(self):
        created = self.create_client()
        self.client.cookies.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        register = self.client.post(
            reverse("accounts:register"),
            {
                "email": "other@example.com",
                "password": "very-secure-test-password-456!",
                "displayName": "Other",
                "organizationName": "Other Org",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201)

        response = self.client.get(reverse("clients:detail", args=[created.data["id"]]))

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "CLIENT_NOT_FOUND")
