from datetime import date, datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from apps.schedules.domain.generation import (
    InvalidScheduleDateRangeError,
    ScheduleGenerationLimitExceededError,
    ScheduleGenerationRangeTooLargeError,
    WeeklyTemplate,
    expand_weekly_templates,
    overlaps,
)


PROJECT_ID = UUID("11111111-1111-1111-1111-111111111111")
USER_ID = UUID("22222222-2222-2222-2222-222222222222")


def template(**overrides):
    values = {
        "id": UUID("33333333-3333-3333-3333-333333333333"),
        "project_id": PROJECT_ID,
        "user_id": USER_ID,
        "day_of_week": 1,
        "start_time": time(9, 0),
        "end_time": time(17, 0),
        "break_minutes": 60,
        "valid_from": date(2026, 7, 1),
        "valid_until": None,
    }
    values.update(overrides)
    return WeeklyTemplate(**values)


class ScheduleGenerationExpansionTests(SimpleTestCase):
    def test_one_hundred_days_is_allowed_but_one_hundred_one_is_rejected(self):
        self.assertEqual(
            expand_weekly_templates(
                templates=[],
                from_date=date(2026, 1, 1),
                to_date=date(2026, 4, 10),
                timezone_name="Asia/Tokyo",
                project_name="Boundary",
            ),
            [],
        )

        with self.assertRaises(ScheduleGenerationRangeTooLargeError):
            expand_weekly_templates(
                templates=[],
                from_date=date(2026, 1, 1),
                to_date=date(2026, 4, 11),
                timezone_name="Asia/Tokyo",
                project_name="Boundary",
            )

    def test_invalid_reversed_date_range_is_rejected(self):
        with self.assertRaises(InvalidScheduleDateRangeError):
            expand_weekly_templates(
                templates=[],
                from_date=date(2026, 7, 2),
                to_date=date(2026, 7, 1),
                timezone_name="Asia/Tokyo",
                project_name="Boundary",
            )

    def test_expands_matching_weekday_inside_template_validity(self):
        candidates = expand_weekly_templates(
            templates=[template(valid_until=date(2026, 7, 31))],
            from_date=date(2026, 7, 20),
            to_date=date(2026, 7, 26),
            timezone_name="Asia/Tokyo",
            project_name="Project A",
        )

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].title, "Project A")
        self.assertEqual(
            candidates[0].scheduled_start_at,
            datetime(2026, 7, 20, 9, 0, tzinfo=ZoneInfo("Asia/Tokyo")),
        )
        self.assertEqual(candidates[0].break_minutes, 60)

    def test_too_many_templates_is_rejected_before_expansion(self):
        templates = [
            template(id=UUID(f"33333333-3333-3333-3333-{index:012d}"))
            for index in range(51)
        ]

        with self.assertRaises(ScheduleGenerationLimitExceededError):
            expand_weekly_templates(
                templates=templates,
                from_date=date(2026, 7, 20),
                to_date=date(2026, 7, 20),
                timezone_name="Asia/Tokyo",
                project_name="Project A",
            )

    def test_overlap_treats_touching_edges_as_non_overlapping(self):
        timezone = ZoneInfo("Asia/Tokyo")

        self.assertTrue(
            overlaps(
                datetime(2026, 7, 20, 9, 0, tzinfo=timezone),
                datetime(2026, 7, 20, 12, 0, tzinfo=timezone),
                datetime(2026, 7, 20, 11, 59, tzinfo=timezone),
                datetime(2026, 7, 20, 13, 0, tzinfo=timezone),
            )
        )
        self.assertFalse(
            overlaps(
                datetime(2026, 7, 20, 9, 0, tzinfo=timezone),
                datetime(2026, 7, 20, 12, 0, tzinfo=timezone),
                datetime(2026, 7, 20, 12, 0, tzinfo=timezone),
                datetime(2026, 7, 20, 13, 0, tzinfo=timezone),
            )
        )
