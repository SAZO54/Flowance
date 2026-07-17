import uuid

from django.test import TestCase

from apps.accounts.models import User
from apps.common.exceptions import AuditLogImmutableError
from apps.organizations.models import Organization

from .models import AuditLog
from .services import AuditLogService


class AuditLogTests(TestCase):
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

    def test_service_records_context_and_redacts_secrets(self):
        trace_id = uuid.uuid4()

        audit_log = AuditLogService.record(
            organization=self.organization,
            actor_user=self.user,
            action="CONTRACT_UPDATED",
            resource_type="project_contract",
            resource_id=uuid.uuid4(),
            before={"rate": 1000, "password": "plain-text"},
            after={"rate": 1200, "nested": {"token": "secret-token"}},
            trace_id=trace_id,
        )

        self.assertEqual(audit_log.before["password"], "[REDACTED]")
        self.assertEqual(audit_log.after["nested"]["token"], "[REDACTED]")
        self.assertEqual(audit_log.trace_id, trace_id)

    def test_audit_log_cannot_be_updated_or_deleted(self):
        audit_log = AuditLogService.record(
            action="LOGIN",
            resource_type="user",
            actor_user=self.user,
        )

        audit_log.action = "CHANGED"
        with self.assertRaises(AuditLogImmutableError):
            audit_log.save()
        with self.assertRaises(AuditLogImmutableError):
            AuditLog.objects.filter(pk=audit_log.pk).update(action="CHANGED")
        with self.assertRaises(AuditLogImmutableError):
            audit_log.delete()
