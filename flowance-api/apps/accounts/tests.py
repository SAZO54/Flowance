from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserModelTests(TestCase):
    def test_original_and_normalized_email_are_stored_separately(self):
        user = User.objects.create_user(
            email="  Owner.Example@Example.COM  ",
            password="safe-test-password",
            display_name="Owner",
        )

        self.assertEqual(user.email, "Owner.Example@Example.COM")
        self.assertEqual(user.normalized_email, "owner.example@example.com")
        self.assertTrue(user.check_password("safe-test-password"))

    def test_soft_deleted_user_is_hidden_from_default_manager(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="safe-test-password",
            display_name="Owner",
        )

        user.delete()

        self.assertFalse(User.objects.filter(pk=user.pk).exists())
        self.assertTrue(User.all_objects.filter(pk=user.pk).exists())

    def test_natural_key_lookup_normalizes_login_email(self):
        user = User.objects.create_user(
            email="Owner.Example@Example.COM",
            password="safe-test-password",
            display_name="Owner",
        )

        found = User.objects.get_by_natural_key("  OWNER.EXAMPLE@example.com  ")

        self.assertEqual(found, user)

    def test_normalized_email_prevents_case_insensitive_duplicates(self):
        User.objects.create_user(
            email="Owner@Example.com",
            password="safe-test-password",
            display_name="Owner",
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email=" owner@example.COM ",
                password="safe-test-password",
                display_name="Duplicate",
            )


class RefreshTokenModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="safe-test-password",
            display_name="Owner",
        )

    def test_issued_refresh_token_is_recorded_as_outstanding(self):
        refresh = RefreshToken.for_user(self.user)

        outstanding = OutstandingToken.objects.get(jti=refresh["jti"])

        self.assertEqual(outstanding.user, self.user)
        self.assertEqual(outstanding.token, str(refresh))

    def test_refresh_token_can_be_blacklisted(self):
        refresh = RefreshToken.for_user(self.user)

        refresh.blacklist()

        outstanding = OutstandingToken.objects.get(jti=refresh["jti"])
        self.assertTrue(BlacklistedToken.objects.filter(token=outstanding).exists())
