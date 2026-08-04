from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.test import TestCase

from apps.common.exceptions import AuthorizationError
from apps.common.tests.factories import (
    ClientFactory,
    OrganizationMemberFactory,
    ProjectFactory,
    ProjectMemberFactory,
    WeeklyScheduleFactory,
    WorkScheduleFactory,
)
from apps.organizations.models import OrganizationRole
from apps.schedules.application.work_service import WorkScheduleService
from apps.schedules.models import WorkSchedule


class WorkScheduleGenerationServiceTests(TestCase):
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
            name="Schedule Project",
        )
        self.weekly = WeeklyScheduleFactory(
            organization=self.organization,
            project=self.project,
            user=self.user,
            created_by=self.user,
            updated_by=self.user,
            day_of_week=1,
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
            valid_from=date(2026, 7, 1),
        )
        self.timezone = ZoneInfo("Asia/Tokyo")

    def generate(self, dry_run=False, membership=None, weekly_schedule_ids=None):
        return WorkScheduleService.generate(
            membership=membership or self.membership,
            project_id=self.project.id,
            from_date=date(2026, 7, 20),
            to_date=date(2026, 7, 20),
            weekly_schedule_ids=weekly_schedule_ids,
            dry_run=dry_run,
        )

    def test_dry_run_returns_candidates_without_persisting(self):
        result = self.generate(dry_run=True)

        self.assertTrue(result.dry_run)
        self.assertEqual(result.created_count, 1)
        self.assertEqual(result.items[0].title, "Schedule Project")
        self.assertEqual(WorkSchedule.objects.count(), 0)

    def test_generation_persists_then_rerun_skips_exact_source(self):
        generated = self.generate()
        rerun = self.generate()

        self.assertEqual(generated.created_count, 1)
        self.assertEqual(rerun.created_count, 0)
        self.assertEqual(rerun.skipped_count, 1)
        self.assertEqual(WorkSchedule.objects.count(), 1)

    def test_manually_overridden_generated_schedule_is_protected(self):
        WorkScheduleFactory(
            organization=self.organization,
            project=self.project,
            user=self.user,
            weekly_schedule=self.weekly,
            title="Moved",
            scheduled_start_at=datetime(2026, 7, 20, 10, 0, tzinfo=self.timezone),
            scheduled_end_at=datetime(2026, 7, 20, 18, 0, tzinfo=self.timezone),
            is_generated=True,
            is_manually_overridden=True,
            created_by=self.user,
            updated_by=self.user,
        )

        result = self.generate()

        self.assertEqual(result.created_count, 0)
        self.assertEqual(result.skipped_count, 1)
        self.assertEqual(
            result.warnings[0]["code"], "WARNING_MANUAL_OVERRIDE_PROTECTED"
        )

    def test_member_needs_project_schedule_permission(self):
        member = OrganizationMemberFactory(
            organization=self.organization,
            role=OrganizationRole.MEMBER,
        )

        with self.assertRaises(AuthorizationError):
            self.generate(membership=member)

        ProjectMemberFactory(
            organization=self.organization,
            project=self.project,
            user=member.user,
            can_edit_schedule=True,
        )
        weekly = WeeklyScheduleFactory(
            organization=self.organization,
            project=self.project,
            user=member.user,
            created_by=member.user,
            updated_by=member.user,
            day_of_week=1,
            start_time=time(9, 0),
            end_time=time(17, 0),
            break_minutes=60,
            valid_from=date(2026, 7, 1),
        )
        result = self.generate(membership=member, weekly_schedule_ids=[weekly.id])

        self.assertEqual(result.created_count, 1)
