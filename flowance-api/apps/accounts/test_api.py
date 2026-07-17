from django.conf import settings
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.organizations.models import OrganizationMember, OrganizationRole

from .models import User


class AuthenticationAPITests(APITestCase):
    password = "very-secure-test-password-123!"

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.register_payload = {
            "email": " Akari@Example.COM ",
            "password": self.password,
            "displayName": "佐藤 あかり",
            "organizationName": "Akari Design",
            "timezone": "Asia/Tokyo",
        }

    def register(self):
        return self.client.post(
            reverse("accounts:register"),
            self.register_payload,
            format="json",
        )

    def csrf_header(self):
        return {"HTTP_X_CSRFTOKEN": self.client.cookies["csrftoken"].value}

    def test_register_creates_owner_context_and_http_only_cookies(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(normalized_email="akari@example.com")
        membership = OrganizationMember.objects.get(user=user)
        self.assertEqual(membership.role, OrganizationRole.OWNER)
        self.assertEqual(response.data["user"]["email"], "Akari@Example.COM")
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertTrue(response.cookies[settings.JWT_ACCESS_COOKIE_NAME]["httponly"])
        self.assertTrue(response.cookies[settings.JWT_REFRESH_COOKIE_NAME]["httponly"])
        self.assertEqual(
            response.cookies[settings.JWT_REFRESH_COOKIE_NAME]["path"],
            settings.JWT_REFRESH_COOKIE_PATH,
        )

    def test_login_sets_cookies_without_returning_jwt(self):
        self.register()
        self.client.cookies.clear()

        response = self.client.post(
            reverse("accounts:login"),
            {"email": "AKARI@example.com", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.JWT_REFRESH_COOKIE_NAME, response.cookies)
        self.assertNotIn("token", response.data)

    def test_me_returns_user_organization_and_permissions(self):
        self.register()

        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["organization"]["role"], "OWNER")
        self.assertIn("projects:create", response.data["permissions"])

    def test_refresh_rotates_cookie_and_blacklists_previous_token(self):
        self.register()
        previous_refresh = self.client.cookies[settings.JWT_REFRESH_COOKIE_NAME].value

        response = self.client.post(
            reverse("accounts:token-refresh"),
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(
            response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value,
            previous_refresh,
        )
        self.assertEqual(BlacklistedToken.objects.count(), 1)

    def test_refresh_requires_csrf(self):
        self.register()

        response = self.client.post(reverse("accounts:token-refresh"))

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "CSRF_FAILED")

    def test_logout_blacklists_refresh_and_clears_cookies(self):
        self.register()

        response = self.client.post(
            reverse("accounts:logout"),
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(BlacklistedToken.objects.count(), 1)
        self.assertEqual(
            response.cookies[settings.JWT_ACCESS_COOKIE_NAME]["max-age"], 0
        )
        self.assertEqual(
            response.cookies[settings.JWT_REFRESH_COOKIE_NAME]["max-age"], 0
        )

    def test_me_without_cookie_returns_401(self):
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "UNAUTHORIZED")
