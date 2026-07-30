from django.test import SimpleTestCase

from apps.common.error_codes import ValidationCode
from apps.schedules.presentation.serializers import (
    GenerateWorkSchedulesSerializer,
    WorkScheduleWriteSerializer,
)


class ScheduleValidationTests(SimpleTestCase):
    def test_work_schedule_end_must_follow_start(self):
        serializer = WorkScheduleWriteSerializer(
            data={
                "projectId": "67f61fb9-3262-46c6-a172-871555dc2c69",
                "title": "設計作業",
                "scheduledStartAt": "2026-07-30T10:00:00+09:00",
                "scheduledEndAt": "2026-07-30T09:00:00+09:00",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["scheduledEndAt"][0].code,
            ValidationCode.INVALID_TIME_RANGE,
        )

    def test_generation_range_is_limited_to_one_hundred_days(self):
        serializer = GenerateWorkSchedulesSerializer(
            data={
                "projectId": "67f61fb9-3262-46c6-a172-871555dc2c69",
                "fromDate": "2026-01-01",
                "toDate": "2026-05-01",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["toDate"][0].code,
            ValidationCode.GENERATION_RANGE_TOO_LARGE,
        )
