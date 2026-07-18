import io
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from apps.files.models import BackgroundTask, FileStatus, StoredFile
from apps.files.tasks import process_project_icon

from .models import (
    Project,
    ProjectIconStatus,
    ProjectIconType,
    ProjectMember,
    ProjectMemberRole,
)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ProjectAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "project-owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Project Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.csrf = self.client.cookies["csrftoken"].value
        self.headers = {"HTTP_X_CSRFTOKEN": self.csrf}
        client_response = self.client.post(
            reverse("clients:collection"),
            {"name": "Nova Client", "status": "ACTIVE"},
            format="json",
            **self.headers,
        )
        self.assertEqual(client_response.status_code, 201)
        self.client_id = client_response.data["id"]

    def create_project(self, **overrides):
        payload = {
            "clientId": self.client_id,
            "name": "Flowance API",
            "status": "ACTIVE",
            "labelColor": "#336699",
            "startDate": "2026-07-01",
            "endDate": "2026-12-31",
            "workloadRate": 60,
            **overrides,
        }
        return self.client.post(
            reverse("projects:collection"),
            payload,
            format="json",
            **self.headers,
        )

    def test_create_list_detail_update_and_optimistic_lock(self):
        self.assertEqual(reverse("projects:collection"), "/api/v1/projects")

        created = self.create_project()
        self.assertEqual(reverse("projects:detail", args=[created.data["id"]]), f"/api/v1/projects/{created.data['id']}")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["icon"]["type"], "DEFAULT")
        self.assertEqual(created.data["icon"]["defaultText"], "FA")
        self.assertEqual(created.data["members"][0]["role"], "MANAGER")
        project_id = created.data["id"]

        membership = ProjectMember.objects.get(project_id=project_id)
        self.assertEqual(membership.role, ProjectMemberRole.MANAGER)
        self.assertTrue(membership.can_edit_schedule)
        self.assertTrue(membership.can_edit_work_record)

        listed = self.client.get(reverse("projects:collection"))
        detailed = self.client.get(reverse("projects:detail", args=[project_id]))
        self.assertEqual(listed.data["pagination"]["totalItems"], 1)
        self.assertEqual(detailed.data["name"], "Flowance API")

        updated = self.client.patch(
            reverse("projects:detail", args=[project_id]),
            {
                "clientId": self.client_id,
                "name": "Flowance Backend",
                "status": "PAUSED",
                "labelColor": "#112233",
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["version"], 2)
        self.assertEqual(updated.data["icon"]["defaultText"], "FB")

        conflict = self.client.patch(
            reverse("projects:detail", args=[project_id]),
            {
                "clientId": self.client_id,
                "name": "Stale Update",
                "status": "ACTIVE",
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.data["code"], "CONCURRENT_MODIFICATION")

    def test_validation_and_cross_tenant_resources_are_hidden(self):
        invalid = self.create_project(
            name="Invalid Period",
            startDate="2026-12-31",
            endDate="2026-01-01",
            workloadRate=101,
        )
        self.assertEqual(invalid.status_code, 400)

        created = self.create_project()
        self.client.cookies.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        register = self.client.post(
            reverse("accounts:register"),
            {
                "email": "other-project@example.com",
                "password": "very-secure-test-password-456!",
                "displayName": "Other",
                "organizationName": "Other Org",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201)

        detail = self.client.get(reverse("projects:detail", args=[created.data["id"]]))
        self.assertEqual(detail.status_code, 404)
        self.assertEqual(detail.data["code"], "PROJECT_NOT_FOUND")

        csrf = self.client.cookies["csrftoken"].value
        cross_tenant_create = self.client.post(
            reverse("projects:collection"),
            {
                "clientId": self.client_id,
                "name": "Hidden Client Project",
                "status": "ACTIVE",
            },
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(cross_tenant_create.status_code, 404)
        self.assertEqual(cross_tenant_create.data["code"], "CLIENT_NOT_FOUND")

    @staticmethod
    def image_upload():
        output = io.BytesIO()
        Image.new("RGB", (320, 200), "#336699").save(output, format="PNG")
        return SimpleUploadedFile(
            "project.png", output.getvalue(), content_type="image/png"
        )

    @patch("apps.projects.application.services.process_project_icon.delay")
    def test_icon_upload_processing_and_delete(self, delay):
        delay.return_value = SimpleNamespace(id="celery-project-test-id")
        with self.captureOnCommitCallbacks(execute=True):
            created = self.client.post(
                reverse("projects:collection"),
                {
                    "clientId": self.client_id,
                    "name": "Icon Project",
                    "status": "ACTIVE",
                    "labelColor": "#336699",
                    "iconFile": self.image_upload(),
                },
                format="multipart",
                **self.headers,
            )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["icon"]["status"], "PENDING")
        task = BackgroundTask.objects.get(task_type="IMAGE_PROCESSING")
        process_project_icon.run(str(task.id))

        project = Project.objects.get(pk=created.data["id"])
        stored_file = StoredFile.objects.get(pk=project.icon_file_id)
        self.assertEqual(project.icon_status, ProjectIconStatus.READY)
        self.assertEqual(stored_file.status, FileStatus.READY)
        self.assertTrue(stored_file.processed_object_key.endswith(".webp"))

        with (
            patch(
                "apps.projects.application.services.delete_stored_file.delay",
                return_value=SimpleNamespace(id="delete-project-test-id"),
            ),
            self.captureOnCommitCallbacks(execute=True),
        ):
            deleted = self.client.patch(
                reverse("projects:detail", args=[project.id]),
                {
                    "clientId": self.client_id,
                    "name": project.name,
                    "status": project.status,
                    "labelColor": project.label_color,
                    "version": project.version,
                    "iconAction": "DELETE",
                },
                format="json",
                **self.headers,
            )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.data["icon"]["type"], ProjectIconType.DEFAULT)
        self.assertIsNone(Project.objects.get(pk=project.id).icon_file_id)
