from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db import transaction

from apps.accounts.application.auth_service import AuthService
from apps.accounts.models import User
from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import AuthorizationError, ConcurrentModificationError
from apps.organizations.models import (
    Organization,
    OrganizationBusinessProfile,
    OrganizationMember,
    OrganizationRole,
)


@dataclass(frozen=True, slots=True)
class SettingsSnapshot:
    user: User
    membership: OrganizationMember
    organization: Organization
    business: OrganizationBusinessProfile


class SettingsService:
    @staticmethod
    def get(*, user: User) -> SettingsSnapshot:
        context = AuthService.current_context(user)
        organization = context.membership.organization
        business = OrganizationBusinessProfile.objects.get(organization=organization)
        return SettingsSnapshot(user, context.membership, organization, business)

    @staticmethod
    @transaction.atomic
    def update(
        *,
        user: User,
        profile: dict[str, Any] | None,
        organization_data: dict[str, Any] | None,
        business_data: dict[str, Any] | None,
        appearance: dict[str, Any] | None,
        versions: dict[str, int],
        request=None,
    ) -> SettingsSnapshot:
        membership = AuthService.current_context(user).membership
        if (
            organization_data is not None or business_data is not None
        ) and membership.role != OrganizationRole.OWNER:
            raise AuthorizationError()

        locked_user = User.all_objects.select_for_update().get(pk=user.pk)
        locked_organization = Organization.all_objects.select_for_update().get(
            pk=membership.organization.pk
        )
        locked_business = OrganizationBusinessProfile.objects.select_for_update().get(
            organization=locked_organization
        )

        user_changed = profile is not None or appearance is not None
        if user_changed and locked_user.version != versions["user"]:
            raise ConcurrentModificationError(versions["user"], locked_user.version)
        if (
            organization_data is not None
            and locked_organization.version != versions["organization"]
        ):
            raise ConcurrentModificationError(
                versions["organization"], locked_organization.version
            )
        if (
            business_data is not None
            and locked_business.version != versions["business"]
        ):
            raise ConcurrentModificationError(
                versions["business"], locked_business.version
            )

        if user_changed:
            changed_fields: list[str] = []
            if profile is not None:
                changed_fields.extend(
                    self_assign(
                        locked_user,
                        profile,
                        {
                            "displayName": "display_name",
                            "familyName": "family_name",
                            "givenName": "given_name",
                            "phoneNumber": "phone_number",
                            "bio": "bio",
                        },
                    )
                )
            if appearance is not None:
                changed_fields.extend(
                    self_assign(
                        locked_user,
                        appearance,
                        {
                            "timezone": "timezone",
                            "weekStartsOn": "week_starts_on",
                            "timeFormat": "time_format",
                            "compactMode": "compact_mode",
                        },
                    )
                )
            locked_user.advance_version()
            locked_user.save(
                update_fields=[*set(changed_fields), "version", "updated_at"]
            )
            record_audit(
                request,
                locked_organization,
                locked_user,
                "USER_SETTINGS_UPDATED",
                changed_fields,
            )

        if organization_data is not None:
            changed_fields = self_assign(
                locked_organization,
                organization_data,
                {"name": "name", "timezone": "timezone"},
            )
            locked_organization.advance_version()
            locked_organization.save(
                update_fields=[*set(changed_fields), "version", "updated_at"]
            )
            record_audit(
                request,
                locked_organization,
                locked_organization,
                "ORGANIZATION_SETTINGS_UPDATED",
                changed_fields,
            )

        if business_data is not None:
            changed_fields = self_assign(
                locked_business,
                business_data,
                {
                    "businessName": "business_name",
                    "postalCode": "postal_code",
                    "prefecture": "prefecture",
                    "address": "address",
                    "invoiceRegistrationNumber": "invoice_registration_number",
                    "defaultTaxRate": "default_tax_rate",
                },
            )
            locked_business.advance_version()
            locked_business.save(
                update_fields=[*set(changed_fields), "version", "updated_at"]
            )
            record_audit(
                request,
                locked_organization,
                locked_business,
                "ORGANIZATION_BUSINESS_SETTINGS_UPDATED",
                changed_fields,
            )

        return SettingsSnapshot(
            locked_user, membership, locked_organization, locked_business
        )


def self_assign(instance, values: dict[str, Any], mapping: dict[str, str]) -> list[str]:
    changed: list[str] = []
    for api_name, model_name in mapping.items():
        if api_name in values:
            setattr(instance, model_name, values[api_name])
            changed.append(model_name)
    return changed


def record_audit(request, organization, resource, action, changed_fields) -> None:
    kwargs = {
        "organization": organization,
        "action": action,
        "resource_type": resource._meta.model_name,
        "resource_id": resource.id,
        "before": {"version": resource.version - 1},
        "after": {
            "version": resource.version,
            "changedFields": sorted(set(changed_fields)),
        },
    }
    if request is not None:
        AuditLogService.record_from_request(request=request, **kwargs)
    else:
        AuditLogService.record(actor_user=None, **kwargs)
