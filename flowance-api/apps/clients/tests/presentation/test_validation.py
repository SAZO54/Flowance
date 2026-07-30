from django.test import SimpleTestCase

from apps.common.error_codes import ValidationCode
from apps.clients.presentation.serializers import ClientWriteSerializer


class ClientValidationTests(SimpleTestCase):
    def payload(self, **overrides):
        values = {"name": "テスト株式会社", "status": "ACTIVE"}
        values.update(overrides)
        return values

    def test_phone_rejects_hyphens(self):
        serializer = ClientWriteSerializer(data=self.payload(phone="090-1234-5678"))

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["phone"][0].code,
            ValidationCode.PHONE_INVALID_FORMAT,
        )

    def test_postal_code_requires_seven_digits(self):
        serializer = ClientWriteSerializer(data=self.payload(postalCode="123-4567"))

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["postalCode"][0].code,
            ValidationCode.POSTAL_CODE_INVALID_FORMAT,
        )

    def test_notes_rejects_more_than_one_thousand_characters(self):
        serializer = ClientWriteSerializer(data=self.payload(notes="a" * 1001))

        self.assertFalse(serializer.is_valid())
        self.assertEqual(serializer.errors["notes"][0].code, "max_length")
