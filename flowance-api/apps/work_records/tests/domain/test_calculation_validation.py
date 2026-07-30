from datetime import datetime, timezone

from django.test import SimpleTestCase

from apps.work_records.domain.calculation import (
    BreakOutsideWorkRecordError,
    BreakPeriodOverlapError,
    InvalidWorkRecordTimeRangeError,
    calculate_work_time,
)


class WorkRecordCalculationValidationTests(SimpleTestCase):
    def at(self, hour: int):
        return datetime(2026, 7, 30, hour, tzinfo=timezone.utc)

    def test_end_must_follow_start(self):
        with self.assertRaises(InvalidWorkRecordTimeRangeError):
            calculate_work_time(
                actual_start_at=self.at(10),
                actual_end_at=self.at(10),
                breaks=[],
                is_billable=True,
            )

    def test_breaks_must_not_overlap(self):
        with self.assertRaises(BreakPeriodOverlapError):
            calculate_work_time(
                actual_start_at=self.at(9),
                actual_end_at=self.at(18),
                breaks=[
                    (self.at(12), self.at(14)),
                    (self.at(13), self.at(15)),
                ],
                is_billable=True,
            )

    def test_break_total_must_be_less_than_work_time(self):
        with self.assertRaises(BreakOutsideWorkRecordError):
            calculate_work_time(
                actual_start_at=self.at(9),
                actual_end_at=self.at(18),
                breaks=[(self.at(9), self.at(18))],
                is_billable=True,
            )
