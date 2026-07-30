from django.test import SimpleTestCase

from apps.common.error_codes import ValidationCode
from apps.projects.presentation.serializers import ProjectWriteSerializer


class ProjectValidationTests(SimpleTestCase):
    def test_end_date_must_not_precede_start_date(self):
        serializer = ProjectWriteSerializer(
            data={
                "clientId": "67f61fb9-3262-46c6-a172-871555dc2c69",
                "name": "テスト案件",
                "startDate": "2026-07-31",
                "endDate": "2026-07-30",
                "status": "ACTIVE",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["endDate"][0].code,
            ValidationCode.INVALID_DATE_RANGE,
        )
