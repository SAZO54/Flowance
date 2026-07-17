from django.test import TestCase

from apps.accounts.models import User

from .models import Organization, OrganizationMember, OrganizationRole


class OrganizationModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="safe-test-password",
            display_name="Owner",
        )
        self.organization = Organization.objects.create(
            name="Flowance",
            owner_user=self.user,
        )

    def test_version_starts_at_one_and_can_be_advanced(self):
        self.assertEqual(self.organization.version, 1)

        self.organization.advance_version()

        self.assertEqual(self.organization.version, 2)

    def test_active_member_can_be_recreated_after_soft_delete(self):
        member = OrganizationMember.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationRole.OWNER,
        )
        member.delete()

        replacement = OrganizationMember.objects.create(
            organization=self.organization,
            user=self.user,
            role=OrganizationRole.OWNER,
        )

        self.assertNotEqual(member.pk, replacement.pk)
