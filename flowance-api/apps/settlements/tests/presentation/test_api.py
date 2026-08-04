from datetime import date
from decimal import Decimal
import uuid

from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from apps.contracts.models import ContractType, ProjectContract
from apps.projects.models import Project

from apps.settlements.models import MonthlyProjectSettlement, SettlementLine


class SettlementAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        registered = self.client.post(
            reverse("accounts:register"),
            {
                "email": "settlement-owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Settlement Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(registered.status_code, 201)
        self.headers = {"HTTP_X_CSRFTOKEN": self.client.cookies["csrftoken"].value}
        client = self.client.post(
            reverse("clients:collection"),
            {"name": "Settlement Client", "status": "ACTIVE"},
            format="json",
            **self.headers,
        )
        project = self.client.post(
            reverse("projects:collection"),
            {
                "clientId": client.data["id"],
                "name": "Settlement Project",
                "status": "ACTIVE",
                "labelColor": "#336699",
            },
            format="json",
            **self.headers,
        )
        self.project = Project.objects.get(pk=project.data["id"])
        ProjectContract.objects.create(
            organization=self.project.organization,
            project=self.project,
            contract_type=ContractType.HOURLY,
            hourly_rate=6000,
            tax_rate=Decimal("10.00"),
            withholding_tax_rate=Decimal("10.21"),
            rounding_unit_minutes=1,
            rounding_method="ROUND_DOWN",
            valid_from=date(2026, 7, 1),
            created_by=self.project.created_by,
            updated_by=self.project.updated_by,
        )
        schedule = self.client.post(
            reverse("schedules:work-collection"),
            {
                "projectId": str(self.project.id),
                "title": "Settlement Project",
                "scheduledStartAt": "2026-07-20T09:00:00+09:00",
                "scheduledEndAt": "2026-07-20T17:00:00+09:00",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(schedule.status_code, 201)
        record = self.client.post(
            reverse("work_records:collection"),
            {
                "projectId": str(self.project.id),
                "actualStartAt": "2026-07-20T09:00:00+09:00",
                "actualEndAt": "2026-07-20T17:00:00+09:00",
                "breaks": [],
                "isBillable": True,
                "status": "DRAFT",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(record.status_code, 201)

    def calculate(self, basis="ACTUAL"):
        return self.client.post(
            reverse("settlements:calculate"),
            {
                "projectId": str(self.project.id),
                "settlementMonth": "2026-07",
                "calculationBasis": basis,
            },
            format="json",
            **self.headers,
        )

    def test_calculate_detail_recalculate_and_finalize(self):
        created = self.calculate()
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["scheduledMinutes"], 480)
        self.assertEqual(created.data["actualMinutes"], 480)
        self.assertEqual(created.data["billableMinutes"], 480)
        self.assertEqual(created.data["baseAmount"], 48000)
        self.assertEqual(created.data["taxAmount"], 4800)
        self.assertEqual(created.data["withholdingAmount"], 4900)
        self.assertEqual(created.data["totalAmount"], 47900)
        self.assertEqual(len(created.data["lines"]), 5)
        self.assertEqual(SettlementLine.objects.count(), 5)

        settlement_id = created.data["id"]
        detail = self.client.get(reverse("settlements:detail", args=[settlement_id]))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["calculationSnapshot"]["targetMinutes"], 480)

        recalculated = self.client.post(
            reverse("settlements:recalculate", args=[settlement_id]),
            {"version": 1},
            format="json",
            **self.headers,
        )
        self.assertEqual(recalculated.status_code, 200)
        self.assertEqual(recalculated.data["version"], 2)

        key = str(uuid.uuid4())
        finalized = self.client.post(
            reverse("settlements:finalize", args=[settlement_id]),
            {"version": 2},
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
            **self.headers,
        )
        self.assertEqual(finalized.status_code, 200)
        self.assertEqual(finalized.data["status"], "FINALIZED")
        self.assertEqual(finalized.data["version"], 3)

        replay = self.client.post(
            reverse("settlements:finalize", args=[settlement_id]),
            {"version": 2},
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
            **self.headers,
        )
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.data["version"], 3)

        rejected = self.client.post(
            reverse("settlements:recalculate", args=[settlement_id]),
            {"version": 3},
            format="json",
            **self.headers,
        )
        self.assertEqual(rejected.status_code, 409)
        self.assertEqual(rejected.data["code"], "SETTLEMENT_ALREADY_FINALIZED")

    def test_duplicate_and_unfinalized_delete(self):
        created = self.calculate("SCHEDULED")
        duplicate = self.calculate("SCHEDULED")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.data["code"], "SETTLEMENT_ALREADY_EXISTS")

        deleted = self.client.delete(
            reverse("settlements:detail", args=[created.data["id"]]) + "?version=1",
            **self.headers,
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(MonthlyProjectSettlement.objects.count(), 0)
