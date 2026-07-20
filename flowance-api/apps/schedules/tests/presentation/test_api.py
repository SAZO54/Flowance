from datetime import date, timedelta

from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User

from apps.schedules.models import WorkSchedule


class ScheduleAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "schedule-owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Schedule Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.user = User.objects.get(normalized_email="schedule-owner@example.com")
        self.csrf = self.client.cookies["csrftoken"].value
        self.headers = {"HTTP_X_CSRFTOKEN": self.csrf}

        client_response = self.client.post(
            reverse("clients:collection"),
            {"name": "Schedule Client", "status": "ACTIVE"},
            format="json",
            **self.headers,
        )
        project_response = self.client.post(
            reverse("projects:collection"),
            {
                "clientId": client_response.data["id"],
                "name": "Schedule Project",
                "status": "ACTIVE",
                "labelColor": "#336699",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(project_response.status_code, 201)
        self.project_id = project_response.data["id"]

    def weekly_payload(self, **overrides):
        return {
            "userId": str(self.user.id),
            "dayOfWeek": 1,
            "startTime": "10:00",
            "endTime": "18:00",
            "breakMinutes": 60,
            "validFrom": "2026-07-01",
            **overrides,
        }

    def create_weekly(self, **overrides):
        return self.client.post(
            reverse("schedules:weekly-collection", args=[self.project_id]),
            self.weekly_payload(**overrides),
            format="json",
            **self.headers,
        )

    def test_weekly_schedule_crud_bulk_and_validation(self):
        created = self.create_weekly()
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["dayOfWeek"], 1)

        listed = self.client.get(
            reverse("schedules:weekly-collection", args=[self.project_id])
        )
        self.assertEqual(len(listed.data["items"]), 1)

        updated = self.client.patch(
            reverse(
                "schedules:weekly-detail",
                args=[self.project_id, created.data["id"]],
            ),
            {
                **self.weekly_payload(startTime="09:30"),
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["version"], 2)

        conflict = self.client.patch(
            reverse(
                "schedules:weekly-detail",
                args=[self.project_id, created.data["id"]],
            ),
            {
                **self.weekly_payload(),
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(conflict.status_code, 409)

        invalid = self.create_weekly(
            startTime="10:00",
            endTime="18:00",
            breakMinutes=480,
            dayOfWeek=2,
        )
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(invalid.data["code"], "INVALID_BREAK_MINUTES")

        bulk = self.client.post(
            reverse("schedules:weekly-bulk", args=[self.project_id]),
            {
                "items": [
                    self.weekly_payload(dayOfWeek=2),
                    self.weekly_payload(dayOfWeek=3),
                ]
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(bulk.status_code, 201)
        self.assertEqual(len(bulk.data["items"]), 2)

        deleted = self.client.delete(
            reverse(
                "schedules:weekly-detail",
                args=[self.project_id, created.data["id"]],
            )
            + "?version=2",
            **self.headers,
        )
        self.assertEqual(deleted.status_code, 204)

    def test_dry_run_generation_persists_nothing_then_generates_and_skips(self):
        weekly = self.create_weekly()
        self.assertEqual(weekly.status_code, 201)
        endpoint = reverse("schedules:work-generate")
        request = {
            "projectId": self.project_id,
            "fromDate": "2026-07-20",
            "toDate": "2026-07-26",
            "dryRun": True,
        }

        dry_run = self.client.post(endpoint, request, format="json", **self.headers)
        self.assertEqual(dry_run.status_code, 200)
        self.assertTrue(dry_run.data["dryRun"])
        self.assertEqual(dry_run.data["createdCount"], 1)
        self.assertEqual(WorkSchedule.objects.count(), 0)

        generated = self.client.post(
            endpoint,
            {**request, "dryRun": False},
            format="json",
            **self.headers,
        )
        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.data["createdCount"], 1)
        self.assertEqual(WorkSchedule.objects.count(), 1)
        self.assertEqual(generated.data["items"][0]["title"], "Schedule Project")

        rerun = self.client.post(
            endpoint,
            {**request, "dryRun": False},
            format="json",
            **self.headers,
        )
        self.assertEqual(rerun.data["createdCount"], 0)
        self.assertEqual(rerun.data["skippedCount"], 1)
        self.assertEqual(WorkSchedule.objects.count(), 1)

    def test_manual_override_is_protected_and_overlap_returns_warning(self):
        self.create_weekly()
        generated = self.client.post(
            reverse("schedules:work-generate"),
            {
                "projectId": self.project_id,
                "fromDate": "2026-07-20",
                "toDate": "2026-07-20",
            },
            format="json",
            **self.headers,
        )
        item = generated.data["items"][0]

        updated = self.client.patch(
            reverse("schedules:work-detail", args=[item["id"]]),
            {
                "projectId": self.project_id,
                "title": "Manually shifted",
                "scheduledStartAt": "2026-07-20T11:00:00+09:00",
                "scheduledEndAt": "2026-07-20T19:00:00+09:00",
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(updated.data["item"]["isManuallyOverridden"])

        rerun = self.client.post(
            reverse("schedules:work-generate"),
            {
                "projectId": self.project_id,
                "fromDate": "2026-07-20",
                "toDate": "2026-07-20",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(rerun.data["createdCount"], 0)
        self.assertEqual(rerun.data["skippedCount"], 1)
        self.assertEqual(
            rerun.data["warnings"][0]["code"],
            "WARNING_MANUAL_OVERRIDE_PROTECTED",
        )

        manual = self.client.post(
            reverse("schedules:work-collection"),
            {
                "projectId": self.project_id,
                "title": "Overlapping work",
                "scheduledStartAt": "2026-07-20T12:00:00+09:00",
                "scheduledEndAt": "2026-07-20T13:00:00+09:00",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(manual.status_code, 201)
        self.assertEqual(manual.data["warnings"][0]["code"], "WARNING_SCHEDULE_OVERLAP")
        self.assertEqual(WorkSchedule.objects.count(), 2)

    def test_generation_limit_calendar_and_cross_tenant_scope(self):
        self.create_weekly()
        too_large = self.client.post(
            reverse("schedules:work-generate"),
            {
                "projectId": self.project_id,
                "fromDate": "2026-01-01",
                "toDate": "2026-04-11",
                "dryRun": True,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(too_large.status_code, 422)
        self.assertEqual(too_large.data["code"], "SCHEDULE_GENERATION_RANGE_TOO_LARGE")

        self.client.post(
            reverse("schedules:work-generate"),
            {
                "projectId": self.project_id,
                "fromDate": "2026-07-20",
                "toDate": "2026-07-20",
            },
            format="json",
            **self.headers,
        )
        events = self.client.get(
            reverse("schedules:calendar-events"),
            {
                "from": "2026-07-20T00:00:00+09:00",
                "to": "2026-07-21T00:00:00+09:00",
                "mode": "planned",
            },
        )
        self.assertEqual(events.status_code, 200)
        self.assertEqual(len(events.data["items"]), 1)
        self.assertEqual(events.data["items"][0]["type"], "SCHEDULE")

        self.client.cookies.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        register = self.client.post(
            reverse("accounts:register"),
            {
                "email": "other-schedule@example.com",
                "password": "very-secure-test-password-456!",
                "displayName": "Other",
                "organizationName": "Other Org",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201)
        hidden = self.client.get(
            reverse("schedules:weekly-collection", args=[self.project_id])
        )
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(hidden.data["code"], "PROJECT_NOT_FOUND")


class ScheduleDomainBoundaryTests(APITestCase):
    def test_one_hundred_days_is_allowed_but_one_hundred_one_is_rejected(self):
        from apps.schedules.domain.generation import (
            ScheduleGenerationRangeTooLargeError,
            expand_weekly_templates,
        )

        allowed = expand_weekly_templates(
            templates=[],
            from_date=date(2026, 1, 1),
            to_date=date(2026, 1, 1) + timedelta(days=99),
            timezone_name="Asia/Tokyo",
            project_name="Boundary",
        )
        self.assertEqual(allowed, [])
        with self.assertRaises(ScheduleGenerationRangeTooLargeError):
            expand_weekly_templates(
                templates=[],
                from_date=date(2026, 1, 1),
                to_date=date(2026, 1, 1) + timedelta(days=100),
                timezone_name="Asia/Tokyo",
                project_name="Boundary",
            )
