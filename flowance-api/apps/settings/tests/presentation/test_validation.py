from django.test import SimpleTestCase

from apps.common.error_codes import ValidationCode
from apps.settings.presentation.serializers import ProfileSettingsSerializer


class SettingsValidationTests(SimpleTestCase):
    def test_phone_number_accepts_digits_up_to_fifteen(self):
        serializer = ProfileSettingsSerializer(data={"phoneNumber": "123456789012345"})

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_phone_number_rejects_symbols(self):
        serializer = ProfileSettingsSerializer(data={"phoneNumber": "090-1234-5678"})

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["phoneNumber"][0].code,
            ValidationCode.SETTINGS_PHONE_INVALID_FORMAT,
        )

    def test_family_name_is_limited_to_fifty_characters(self):
        serializer = ProfileSettingsSerializer(data={"familyName": "a" * 51})

        self.assertFalse(serializer.is_valid())
        self.assertEqual(serializer.errors["familyName"][0].code, "max_length")
