from datetime import date

from rest_framework.test import APIClient, APITestCase

from apps.audit_logs.models import AuditLog
from apps.organizations.models import OrganizationMember, OrganizationRole
from apps.projects.models import Project
from apps.settlements.models import (
    CalculationBasis,
    MonthlyProjectSettlement,
    SettlementStatus,
)

from apps.contracts.models import ProjectContract


class ContractAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        register = self.client.post(
            "/api/v1/auth/register",
            {
                "email": "contract-owner@example.com",
                "password": "very-secure-test-password-123!",
                "displayName": "Contract Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201)
        self.csrf = self.client.cookies["csrftoken"].value
        self.headers = {"HTTP_X_CSRFTOKEN": self.csrf}
        created_client = self.client.post(
            "/api/v1/clients",
            {"name": "Contract Client", "status": "ACTIVE"},
            format="json",
            **self.headers,
        )
        project = self.client.post(
            "/api/v1/projects",
            {
                "clientId": created_client.data["id"],
                "name": "Contract Project",
                "status": "ACTIVE",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(project.status_code, 201)
        self.project_id = project.data["id"]
        self.collection_url = f"/api/v1/projects/{self.project_id}/contracts"

    def payload(self, **overrides):
        return {
            "contractType": "HOURLY",
            "currency": "JPY",
            "hourlyRate": 5000,
            "taxRate": 10,
            "withholdingTaxRate": 10.21,
            "roundingUnitMinutes": 15,
            "roundingMethod": "ROUND_DOWN",
            "closingDay": 31,
            "paymentTermsDays": 30,
            "validFrom": "2026-07-01",
            "validUntil": "2026-07-31",
            "status": "ACTIVE",
            **overrides,
        }

    def create_contract(self, **overrides):
        return self.client.post(
            self.collection_url,
            self.payload(**overrides),
            format="json",
            **self.headers,
        )

    def test_create_list_detail_update_and_delete(self):
        created = self.create_contract()
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["contractType"], "HOURLY")
        self.assertIn("isCurrent", created.data)
        contract_id = created.data["id"]
        detail_url = f"{self.collection_url}/{contract_id}"

        listed = self.client.get(self.collection_url)
        detailed = self.client.get(detail_url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data["items"]), 1)
        self.assertEqual(detailed.data["id"], contract_id)

        updated = self.client.patch(
            detail_url,
            self.payload(
                hourlyRate=6000,
                validUntil="2026-08-31",
                version=created.data["version"],
            ),
            format="json",
            **self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["hourlyRate"], 6000)
        self.assertEqual(updated.data["version"], 2)

        stale = self.client.patch(
            detail_url,
            self.payload(version=1),
            format="json",
            **self.headers,
        )
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.data["code"], "CONCURRENT_MODIFICATION")

        deleted = self.client.delete(
            f"{detail_url}?version={updated.data['version']}",
            **self.headers,
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(ProjectContract.objects.filter(pk=contract_id).exists())
        self.assertTrue(
            AuditLog.objects.filter(
                resource_id=contract_id,
                action="CONTRACT_DELETED",
            ).exists()
        )

    def test_all_contract_types_and_condition_validation(self):
        monthly_range = self.payload(
            contractType="MONTHLY_RANGE",
            hourlyRate=None,
            monthlyRate=800000,
            minimumMinutes=8400,
            maximumMinutes=10800,
            baseMinutes=9600,
            deductionRate=5000,
            overtimeRate=5000,
            validFrom="2026-08-01",
            validUntil="2026-08-31",
        )
        monthly_fixed = self.payload(
            contractType="MONTHLY_FIXED",
            hourlyRate=None,
            monthlyRate=700000,
            roundingUnitMinutes=None,
            roundingMethod=None,
            validFrom="2026-09-01",
            validUntil="2026-09-30",
        )
        performance = self.payload(
            contractType="PERFORMANCE",
            hourlyRate=None,
            performanceAmount=450000,
            roundingUnitMinutes=None,
            roundingMethod=None,
            validFrom="2026-10-01",
            validUntil=None,
        )
        for payload in (monthly_range, monthly_fixed, performance):
            response = self.client.post(
                self.collection_url,
                payload,
                format="json",
                **self.headers,
            )
            self.assertEqual(
                response.status_code,
                201,
                (payload["contractType"], response.data),
            )

        invalid = self.client.post(
            self.collection_url,
            self.payload(hourlyRate=None),
            format="json",
            **self.headers,
        )
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(invalid.data["code"], "INVALID_CONTRACT_CONDITION")

    def test_overlap_member_permission_and_cross_tenant_visibility(self):
        created = self.create_contract()
        overlap = self.create_contract(
            validFrom="2026-07-31",
            validUntil="2026-08-31",
        )
        self.assertEqual(overlap.status_code, 409)
        self.assertEqual(overlap.data["code"], "CONTRACT_PERIOD_OVERLAP")

        membership = OrganizationMember.objects.get(
            user__email="contract-owner@example.com"
        )
        membership.role = OrganizationRole.MEMBER
        membership.save(update_fields=["role"])
        readable = self.client.get(self.collection_url)
        forbidden = self.client.patch(
            f"{self.collection_url}/{created.data['id']}",
            self.payload(version=created.data["version"]),
            format="json",
            **self.headers,
        )
        self.assertEqual(readable.status_code, 200)
        self.assertEqual(forbidden.status_code, 403, forbidden.data)

    def test_contract_in_use_cannot_be_deleted(self):
        created = self.create_contract()
        contract = ProjectContract.objects.get(pk=created.data["id"])
        project = Project.objects.get(pk=self.project_id)
        MonthlyProjectSettlement.objects.create(
            organization=project.organization,
            project=project,
            contract=contract,
            settlement_month=date(2026, 7, 1),
            calculation_basis=CalculationBasis.ACTUAL,
            status=SettlementStatus.CALCULATED,
            calculation_snapshot={},
            created_by=project.created_by,
            updated_by=project.updated_by,
        )
        response = self.client.delete(
            f"{self.collection_url}/{contract.id}?version={contract.version}",
            **self.headers,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "CONTRACT_IN_USE")
