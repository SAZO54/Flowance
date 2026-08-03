from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from apps.schedules.domain.generation import (
    InvalidBreakMinutesError,
    validate_weekly_schedule,
    validate_work_schedule,
)


class ScheduleBreakMinutesBoundaryTests(SimpleTestCase):
    def test_weekly_schedule_rejects_break_minutes_equal_to_duration(self):
        with self.assertRaises(InvalidBreakMinutesError):
            validate_weekly_schedule(
                start_time=time(10, 0),
                end_time=time(18, 0),
                break_minutes=480,
                valid_from=date(2026, 7, 1),
                valid_until=None,
            )

    def test_weekly_schedule_allows_break_minutes_shorter_than_duration(self):
        validate_weekly_schedule(
            start_time=time(10, 0),
            end_time=time(18, 0),
            break_minutes=479,
            valid_from=date(2026, 7, 1),
            valid_until=None,
        )

    def test_work_schedule_rejects_break_minutes_equal_to_duration(self):
        timezone = ZoneInfo("Asia/Tokyo")

        with self.assertRaises(InvalidBreakMinutesError):
            validate_work_schedule(
                scheduled_start_at=datetime(2026, 7, 1, 10, 0, tzinfo=timezone),
                scheduled_end_at=datetime(2026, 7, 1, 18, 0, tzinfo=timezone),
                break_minutes=480,
            )

    def test_work_schedule_allows_break_minutes_shorter_than_duration(self):
        timezone = ZoneInfo("Asia/Tokyo")

        validate_work_schedule(
            scheduled_start_at=datetime(2026, 7, 1, 10, 0, tzinfo=timezone),
            scheduled_end_at=datetime(2026, 7, 1, 18, 0, tzinfo=timezone),
            break_minutes=479,
        )
