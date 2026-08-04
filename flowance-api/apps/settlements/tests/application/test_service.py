from datetime import date, datetime
from decimal import Decimal
import uuid
from zoneinfo import ZoneInfo

from django.test import TestCase

from apps.common.exceptions import AuthorizationError, ConcurrentModificationError
from apps.common.tests.factories import (
    ClientFactory,
    OrganizationMemberFactory,
    ProjectContractFactory,
    ProjectFactory,
    WorkRecordFactory,
    WorkScheduleFactory,
)
from apps.contracts.models import ContractType
from apps.organizations.models import OrganizationRole
from apps.settlements.application.service import (
    IdempotencyConflictError,
    SettlementAlreadyExistsError,
    SettlementFinalizedError,
    SettlementService,
)
from apps.settlements.models import (
    CalculationBasis,
    IdempotencyKey,
    MonthlyProjectSettlement,
    SettlementLine,
    SettlementStatus,
)


class SettlementServiceTests(TestCase):
    def setUp(self):
        self.membership = OrganizationMemberFactory(role=OrganizationRole.OWNER)
        self.organization = self.membership.organization
        self.user = self.membership.user
        self.client = ClientFactory(
            organization=self.organization,
            created_by=self.user,
            updated_by=self.user,
        )
        self.project = ProjectFactory(
            organization=self.organization,
            client=self.client,
            created_by=self.user,
            updated_by=self.user,
        )
        self.contract = ProjectContractFactory(
            organization=self.organization,
            project=self.project,
            created_by=self.user,
            updated_by=self.user,
            contract_type=ContractType.HOURLY,
            hourly_rate=6000,
            tax_rate=Decimal("10.00"),
            withholding_tax_rate=Decimal("10.21"),
        )
        self.timezone = ZoneInfo("Asia/Tokyo")
        WorkScheduleFactory(
            organization=self.organization,
            project=self.project,
            user=self.user,
            created_by=self.user,
            updated_by=self.user,
            scheduled_start_at=datetime(2026, 7, 20, 9, 0, tzinfo=self.timezone),
            scheduled_end_at=datetime(2026, 7, 20, 17, 0, tzinfo=self.timezone),
            break_minutes=60,
        )
        WorkRecordFactory(
            organization=self.organization,
            project=self.project,
            user=self.user,
            created_by=self.user,
            updated_by=self.user,
            actual_start_at=datetime(2026, 7, 20, 9, 0, tzinfo=self.timezone),
            actual_end_at=datetime(2026, 7, 20, 17, 0, tzinfo=self.timezone),
            actual_minutes=480,
            billable_minutes=480,
        )

    def calculate(self, basis=CalculationBasis.ACTUAL):
        return SettlementService.calculate(
            membership=self.membership,
            project_id=self.project.id,
            month=date(2026, 7, 1),
            basis=basis,
        )

    def test_calculate_creates_snapshot_lines_and_amounts(self):
        settlement = self.calculate()

        self.assertEqual(settlement.actual_minutes, 480)
        self.assertEqual(settlement.billable_minutes, 480)
        self.assertEqual(settlement.base_amount, 48000)
        self.assertEqual(settlement.tax_amount, 4800)
        self.assertEqual(settlement.withholding_amount, 4900)
        self.assertEqual(settlement.total_amount, 47900)
        self.assertEqual(settlement.calculation_snapshot["targetMinutes"], 480)
        self.assertEqual(
            SettlementLine.objects.filter(settlement=settlement).count(), 5
        )

    def test_duplicate_month_is_rejected(self):
        self.calculate()

        with self.assertRaises(SettlementAlreadyExistsError):
            self.calculate()

    def test_recalculate_replaces_amounts_lines_and_advances_version(self):
        settlement = self.calculate()
        WorkRecordFactory(
            organization=self.organization,
            project=self.project,
            user=self.user,
            created_by=self.user,
            updated_by=self.user,
            actual_start_at=datetime(2026, 7, 21, 9, 0, tzinfo=self.timezone),
            actual_end_at=datetime(2026, 7, 21, 10, 0, tzinfo=self.timezone),
            actual_minutes=60,
            billable_minutes=60,
        )

        recalculated = SettlementService.recalculate(
            membership=self.membership,
            settlement_id=settlement.id,
            expected_version=1,
        )

        self.assertEqual(recalculated.version, 2)
        self.assertEqual(recalculated.billable_minutes, 540)
        self.assertEqual(recalculated.base_amount, 54000)
        self.assertEqual(
            SettlementLine.objects.filter(settlement=settlement).count(), 5
        )

    def test_recalculate_requires_current_version(self):
        settlement = self.calculate()

        with self.assertRaises(ConcurrentModificationError):
            SettlementService.recalculate(
                membership=self.membership,
                settlement_id=settlement.id,
                expected_version=99,
            )

    def test_finalize_is_idempotent_for_same_request_and_rejects_key_reuse(self):
        settlement = self.calculate()
        key = uuid.uuid4()

        finalized = SettlementService.finalize(
            membership=self.membership,
            settlement_id=settlement.id,
            expected_version=1,
            idempotency_key=key,
        )
        replay = SettlementService.finalize(
            membership=self.membership,
            settlement_id=settlement.id,
            expected_version=1,
            idempotency_key=key,
        )

        self.assertEqual(finalized.status, SettlementStatus.FINALIZED)
        self.assertEqual(replay.id, settlement.id)
        self.assertEqual(IdempotencyKey.objects.count(), 1)
        with self.assertRaises(IdempotencyConflictError):
            SettlementService.finalize(
                membership=self.membership,
                settlement_id=settlement.id,
                expected_version=2,
                idempotency_key=key,
            )

    def test_finalized_settlement_cannot_be_recalculated_or_deleted(self):
        settlement = self.calculate()
        finalized = SettlementService.finalize(
            membership=self.membership,
            settlement_id=settlement.id,
            expected_version=1,
            idempotency_key=uuid.uuid4(),
        )

        with self.assertRaises(SettlementFinalizedError):
            SettlementService.recalculate(
                membership=self.membership,
                settlement_id=finalized.id,
                expected_version=finalized.version,
            )
        with self.assertRaises(SettlementFinalizedError):
            SettlementService.delete(
                membership=self.membership,
                settlement_id=finalized.id,
                expected_version=finalized.version,
            )

    def test_member_cannot_calculate_settlement(self):
        member = OrganizationMemberFactory(
            organization=self.organization,
            role=OrganizationRole.MEMBER,
        )

        with self.assertRaises(AuthorizationError):
            SettlementService.calculate(
                membership=member,
                project_id=self.project.id,
                month=date(2026, 7, 1),
                basis=CalculationBasis.ACTUAL,
            )

    def test_delete_removes_unfinalized_settlement(self):
        settlement = self.calculate()

        SettlementService.delete(
            membership=self.membership,
            settlement_id=settlement.id,
            expected_version=1,
        )

        self.assertFalse(
            MonthlyProjectSettlement.objects.filter(id=settlement.id).exists()
        )
