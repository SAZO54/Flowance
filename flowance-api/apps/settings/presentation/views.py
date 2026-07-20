from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import permissions_for
from apps.organizations.models import OrganizationRole

from ..application import SettingsService
from .serializers import SettingsUpdateSerializer


def settings_payload(snapshot):
    user = snapshot.user
    organization = snapshot.organization
    business = snapshot.business
    can_edit = snapshot.membership.role == OrganizationRole.OWNER
    return {
        "profile": {
            "id": str(user.id),
            "email": user.email,
            "displayName": user.display_name,
            "familyName": user.family_name,
            "givenName": user.given_name,
            "phoneNumber": user.phone_number,
            "bio": user.bio,
            "updatedAt": user.updated_at.isoformat(),
        },
        "organization": {
            "id": str(organization.id),
            "name": organization.name,
            "timezone": organization.timezone,
            "currency": organization.currency,
            "role": snapshot.membership.role,
            "canEdit": can_edit,
            "updatedAt": organization.updated_at.isoformat(),
        },
        "business": {
            "businessName": business.business_name,
            "postalCode": business.postal_code,
            "prefecture": business.prefecture,
            "address": business.address,
            "invoiceRegistrationNumber": business.invoice_registration_number,
            "defaultTaxRate": (
                str(business.default_tax_rate)
                if business.default_tax_rate is not None
                else None
            ),
            "canEdit": can_edit,
            "updatedAt": business.updated_at.isoformat(),
        },
        "appearance": {
            "timezone": user.timezone,
            "weekStartsOn": user.week_starts_on,
            "timeFormat": user.time_format,
            "compactMode": user.compact_mode,
        },
        "versions": {
            "user": user.version,
            "organization": organization.version,
            "business": business.version,
        },
        "permissions": list(permissions_for(snapshot.membership.role)),
    }


class SettingsView(APIView):
    def get(self, request):
        return Response(settings_payload(SettingsService.get(user=request.user)))

    def patch(self, request):
        serializer = SettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        snapshot = SettingsService.update(
            user=request.user,
            profile=values.get("profile"),
            organization_data=values.get("organization"),
            business_data=values.get("business"),
            appearance=values.get("appearance"),
            versions=values["versions"],
            request=request,
        )
        return Response(settings_payload(snapshot))
