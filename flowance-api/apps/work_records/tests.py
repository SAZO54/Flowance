from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .domain.calculation import round_minutes
from .models import WorkRecord, WorkRecordBreak


class WorkRecordAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "record-owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Record Owner",
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
            {"name": "Record Client", "status": "ACTIVE"},
            format="json",
            **self.headers,
        )
        project_response = self.client.post(
            reverse("projects:collection"),
            {
                "clientId": client_response.data["id"],
                "name": "Record Project",
                "status": "ACTIVE",
                "labelColor": "#336699",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(project_response.status_code, 201)
        self.project_id = project_response.data["id"]

    def payload(self, **overrides):
        return {
            "projectId": self.project_id,
            "actualStartAt": "2026-07-20T09:00:00+09:00",
            "actualEndAt": "2026-07-20T18:00:00+09:00",
            "breaks": [
                {
                    "startAt": "2026-07-20T12:00:00+09:00",
                    "endAt": "2026-07-20T13:00:00+09:00",
                },
                {
                    "startAt": "2026-07-20T15:00:00+09:00",
                    "endAt": "2026-07-20T15:30:00+09:00",
                },
            ],
            "isBillable": True,
            "status": "DRAFT",
            **overrides,
        }

    def create_record(self, **overrides):
        return self.client.post(
            reverse("work_records:collection"),
            self.payload(**overrides),
            format="json",
            **self.headers,
        )

    def test_backend_calculates_actual_break_and_billable_minutes(self):
        created = self.create_record()

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["actualMinutes"], 450)
        self.assertEqual(created.data["breakMinutes"], 90)
        self.assertEqual(created.data["billableMinutes"], 450)
        self.assertEqual(len(created.data["breaks"]), 2)
        self.assertEqual(
            [item["breakMinutes"] for item in created.data["breaks"]],
            [60, 30],
        )
        record = WorkRecord.objects.get(pk=created.data["id"])
        self.assertEqual(record.actual_minutes, 450)
        self.assertEqual(WorkRecordBreak.objects.filter(work_record=record).count(), 2)

    def test_non_billable_is_zero_and_computed_input_is_rejected(self):
        non_billable = self.create_record(isBillable=False, breaks=[])
        self.assertEqual(non_billable.status_code, 201)
        self.assertEqual(non_billable.data["actualMinutes"], 540)
        self.assertEqual(non_billable.data["billableMinutes"], 0)

        rejected = self.create_record(
            actualMinutes=1,
            breakMinutes=2,
            billableMinutes=3,
        )
        self.assertEqual(rejected.status_code, 400)
        self.assertEqual(rejected.data["code"], "VALIDATION_ERROR")
        self.assertEqual(WorkRecord.objects.count(), 1)

    def test_break_outside_and_overlap_are_rejected(self):
        outside = self.create_record(
            breaks=[
                {
                    "startAt": "2026-07-20T08:30:00+09:00",
                    "endAt": "2026-07-20T09:30:00+09:00",
                }
            ]
        )
        self.assertEqual(outside.status_code, 422)
        self.assertEqual(outside.data["code"], "BREAK_OUTSIDE_WORK_RECORD")

        overlap = self.create_record(
            breaks=[
                {
                    "startAt": "2026-07-20T12:00:00+09:00",
                    "endAt": "2026-07-20T13:00:00+09:00",
                },
                {
                    "startAt": "2026-07-20T12:30:00+09:00",
                    "endAt": "2026-07-20T13:30:00+09:00",
                },
            ]
        )
        self.assertEqual(overlap.status_code, 422)
        self.assertEqual(overlap.data["code"], "BREAK_PERIOD_OVERLAP")
        self.assertEqual(WorkRecord.objects.count(), 0)

    def test_list_detail_update_version_conflict_and_delete(self):
        created = self.create_record()
        record_id = created.data["id"]
        self.assertEqual(reverse("work_records:collection"), "/api/v1/work-records")
        self.assertEqual(
            reverse("work_records:detail", args=[record_id]),
            f"/api/v1/work-records/{record_id}",
        )

        listed = self.client.get(
            reverse("work_records:collection"),
            {
                "from": "2026-07-20T00:00:00+09:00",
                "to": "2026-07-21T00:00:00+09:00",
                "projectId": self.project_id,
            },
        )
        detailed = self.client.get(reverse("work_records:detail", args=[record_id]))
        self.assertEqual(listed.data["pagination"]["totalItems"], 1)
        self.assertEqual(detailed.data["actualMinutes"], 450)

        updated = self.client.patch(
            reverse("work_records:detail", args=[record_id]),
            {
                **self.payload(
                    actualStartAt="2026-07-20T10:00:00+09:00",
                    breaks=[
                        {
                            "startAt": "2026-07-20T12:00:00+09:00",
                            "endAt": "2026-07-20T12:30:00+09:00",
                        }
                    ],
                ),
                "version": 1,
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["actualMinutes"], 450)
        self.assertEqual(updated.data["breakMinutes"], 30)
        self.assertEqual(updated.data["version"], 2)

        conflict = self.client.patch(
            reverse("work_records:detail", args=[record_id]),
            {**self.payload(), "version": 1},
            format="json",
            **self.headers,
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.data["code"], "CONCURRENT_MODIFICATION")

        deleted = self.client.delete(
            reverse("work_records:detail", args=[record_id]) + "?version=2",
            **self.headers,
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(WorkRecord.objects.count(), 0)

    def test_work_schedule_link_calendar_actual_and_cross_tenant_scope(self):
        schedule = self.client.post(
            reverse("schedules:work-collection"),
            {
                "projectId": self.project_id,
                "title": "Linked schedule",
                "scheduledStartAt": "2026-07-20T09:00:00+09:00",
                "scheduledEndAt": "2026-07-20T18:00:00+09:00",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(schedule.status_code, 201)
        created = self.create_record(
            workScheduleId=schedule.data["item"]["id"],
            breaks=[],
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["workScheduleId"], schedule.data["item"]["id"])

        events = self.client.get(
            reverse("schedules:calendar-events"),
            {
                "from": "2026-07-20T00:00:00+09:00",
                "to": "2026-07-21T00:00:00+09:00",
                "mode": "actual",
            },
        )
        self.assertEqual(events.status_code, 200)
        self.assertEqual(len(events.data["items"]), 1)
        self.assertEqual(events.data["items"][0]["type"], "WORK_RECORD")

        self.client.cookies.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        register = self.client.post(
            reverse("accounts:register"),
            {
                "email": "other-record@example.com",
                "password": "very-secure-test-password-456!",
                "displayName": "Other",
                "organizationName": "Other Org",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201)
        hidden = self.client.get(
            reverse("work_records:detail", args=[created.data["id"]])
        )
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(hidden.data["code"], "WORK_RECORD_NOT_FOUND")


class WorkRecordCalculationTests(APITestCase):
    def test_rounding_rules(self):
        self.assertEqual(round_minutes(67, 15, "ROUND_DOWN"), 60)
        self.assertEqual(round_minutes(61, 15, "ROUND_UP"), 75)
        self.assertEqual(round_minutes(67, 15, "ROUND_HALF_UP"), 60)
        self.assertEqual(round_minutes(68, 15, "ROUND_HALF_UP"), 75)
        self.assertEqual(round_minutes(67, None, None), 67)
