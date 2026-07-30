from rest_framework import serializers

from apps.common.error_codes import ValidationCode
from apps.common.validation import (
    PHONE_PATTERN,
    POSTAL_CODE_PATTERN,
    validate_optional_pattern,
    validation_error,
)

from ..models import ClientStatus


class ClientWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    contactName = serializers.CharField(
        max_length=100, allow_null=True, allow_blank=True, required=False
    )
    email = serializers.EmailField(
        max_length=254, allow_null=True, allow_blank=True, required=False
    )
    phone = serializers.CharField(
        max_length=50, allow_null=True, allow_blank=True, required=False
    )
    postalCode = serializers.CharField(
        max_length=20, allow_null=True, allow_blank=True, required=False
    )
    address = serializers.CharField(
        max_length=500, allow_null=True, allow_blank=True, required=False
    )
    status = serializers.ChoiceField(choices=ClientStatus.choices)
    notes = serializers.CharField(
        max_length=1000, allow_null=True, allow_blank=True, required=False
    )
    iconFile = serializers.FileField(required=False, write_only=True)

    def validate_phone(self, value: str | None) -> str | None:
        return validate_optional_pattern(
            value,
            pattern=PHONE_PATTERN,
            code=ValidationCode.PHONE_INVALID_FORMAT,
        )

    def validate_postalCode(self, value: str | None) -> str | None:
        return validate_optional_pattern(
            value,
            pattern=POSTAL_CODE_PATTERN,
            code=ValidationCode.POSTAL_CODE_INVALID_FORMAT,
        )

    def model_data(self):
        values = self.validated_data
        return {
            "name": values["name"],
            "contact_name": values.get("contactName"),
            "email": values.get("email"),
            "phone": values.get("phone"),
            "postal_code": values.get("postalCode"),
            "address": values.get("address"),
            "status": values["status"],
            "notes": values.get("notes"),
        }


class ClientUpdateSerializer(ClientWriteSerializer):
    version = serializers.IntegerField(min_value=1)
    iconAction = serializers.ChoiceField(
        choices=("KEEP", "DELETE"), default="KEEP", required=False
    )

    def validate(self, attrs):
        if attrs.get("iconFile") and attrs.get("iconAction") == "DELETE":
            raise validation_error(
                "iconAction",
                ValidationCode.MUTUALLY_EXCLUSIVE,
            )
        return attrs


class ClientListQuerySerializer(serializers.Serializer):
    query = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=ClientStatus.choices, required=False)
    page = serializers.IntegerField(min_value=1, default=1)
    pageSize = serializers.IntegerField(min_value=1, max_value=100, default=20)
    sort = serializers.ChoiceField(
        choices=("name", "-name", "updatedAt", "-updatedAt", "revenue", "-revenue"),
        default="name",
    )
