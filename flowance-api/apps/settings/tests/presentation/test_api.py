from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.audit_logs.models import AuditLog
from apps.organizations.models import (
    OrganizationBusinessProfile,
    OrganizationMember,
    OrganizationRole,
)


class SettingsAPITests(APITestCase):
    password = "very-secure-test-password-123!"

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "owner@example.com",
                "password": self.password,
                "displayName": "Owner",
                "organizationName": "Flowance",
                "timezone": "Asia/Tokyo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.user = User.objects.get(normalized_email="owner@example.com")
        self.membership = OrganizationMember.objects.get(user=self.user)
        self.organization = self.membership.organization
        self.business = OrganizationBusinessProfile.objects.get(
            organization=self.organization
        )
        self.url = reverse("settings:detail")

    def csrf_header(self):
        return {"HTTP_X_CSRFTOKEN": self.client.cookies["csrftoken"].value}

    def test_get_returns_composite_settings_without_fixture_values(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["displayName"], "Owner")
        self.assertEqual(response.data["profile"]["familyName"], "")
        self.assertEqual(response.data["business"]["businessName"], "")
        self.assertEqual(response.data["appearance"]["weekStartsOn"], "MONDAY")
        self.assertEqual(response.data["versions"]["user"], 1)
        self.assertTrue(response.data["organization"]["canEdit"])

    def test_patch_updates_all_sections_atomically(self):
        response = self.client.patch(
            self.url,
            {
                "profile": {
                    "displayName": "Owner Updated",
                    "familyName": "山田",
                    "givenName": "花子",
                    "phoneNumber": "09000000000",
                    "bio": "プロフィール",
                },
                "organization": {
                    "name": "Flowance Studio",
                    "timezone": "Asia/Tokyo",
                },
                "business": {
                    "businessName": "Flowance Studio",
                    "postalCode": "150-0001",
                    "prefecture": "東京都",
                    "address": "渋谷区",
                    "invoiceRegistrationNumber": "T1234567890123",
                    "defaultTaxRate": "10.00",
                },
                "appearance": {
                    "timezone": "UTC",
                    "weekStartsOn": "SUNDAY",
                    "timeFormat": "H12",
                    "compactMode": True,
                },
                "versions": {"user": 1, "organization": 1, "business": 1},
            },
            format="json",
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["versions"],
            {
                "user": 2,
                "organization": 2,
                "business": 2,
            },
        )
        self.assertEqual(response.data["appearance"]["timezone"], "UTC")
        self.assertEqual(response.data["business"]["defaultTaxRate"], "10.00")
        self.assertEqual(
            set(
                AuditLog.objects.filter(
                    action__in=[
                        "USER_SETTINGS_UPDATED",
                        "ORGANIZATION_SETTINGS_UPDATED",
                        "ORGANIZATION_BUSINESS_SETTINGS_UPDATED",
                    ]
                ).values_list("action", flat=True)
            ),
            {
                "USER_SETTINGS_UPDATED",
                "ORGANIZATION_SETTINGS_UPDATED",
                "ORGANIZATION_BUSINESS_SETTINGS_UPDATED",
            },
        )

    def test_omitted_sections_are_not_updated(self):
        response = self.client.patch(
            self.url,
            {
                "profile": {"familyName": "佐藤"},
                "versions": {"user": 1},
            },
            format="json",
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["familyName"], "佐藤")
        self.assertEqual(response.data["versions"]["organization"], 1)
        self.assertEqual(response.data["versions"]["business"], 1)

    def test_version_conflict_rolls_back_other_sections(self):
        self.business.advance_version()
        self.business.save(update_fields=["version"])

        response = self.client.patch(
            self.url,
            {
                "profile": {"displayName": "Should Roll Back"},
                "business": {"businessName": "Conflict"},
                "versions": {"user": 1, "business": 1},
            },
            format="json",
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 409)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Owner")
        self.assertEqual(self.user.version, 1)

    def test_non_owner_cannot_update_organization_or_business(self):
        member = User.objects.create_user(
            email="member@example.com",
            password=self.password,
            display_name="Member",
        )
        OrganizationMember.objects.create(
            organization=self.organization,
            user=member,
            role=OrganizationRole.MEMBER,
        )
        self.client.cookies.clear()
        self.client.force_authenticate(member)

        response = self.client.patch(
            self.url,
            {
                "organization": {"name": "Forbidden"},
                "versions": {"organization": 1},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "Flowance")

    def test_patch_requires_csrf_for_cookie_authentication(self):
        response = self.client.patch(
            self.url,
            {
                "appearance": {"compactMode": True},
                "versions": {"user": 1},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "CSRF_FAILED")

    def test_email_cannot_be_updated(self):
        response = self.client.patch(
            self.url,
            {
                "profile": {"email": "changed@example.com"},
                "versions": {"user": 1},
            },
            format="json",
            **self.csrf_header(),
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "owner@example.com")

    def test_auth_me_includes_appearance(self):
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["appearance"]["timeFormat"], "H24")
        self.assertIn("settings:self:update", response.data["permissions"])
