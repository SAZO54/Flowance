import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from apps.accounts.models import TimeFormat, WeekStartsOn


def validate_timezone(value: str) -> None:
    try:
        ZoneInfo(value)
    except ZoneInfoNotFoundError as exc:
        raise serializers.ValidationError(
            "有効なIANAタイムゾーンを指定してください。"
        ) from exc


class NonEmptySectionSerializer(serializers.Serializer):
    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("更新項目を1つ以上指定してください。")
        return attrs


class ProfileSettingsSerializer(NonEmptySectionSerializer):
    displayName = serializers.CharField(max_length=100, required=False)
    familyName = serializers.CharField(max_length=100, allow_blank=True, required=False)
    givenName = serializers.CharField(max_length=100, allow_blank=True, required=False)
    phoneNumber = serializers.RegexField(
        re.compile(r"^[0-9+()\-\s]*$"),
        max_length=32,
        allow_blank=True,
        required=False,
    )
    bio = serializers.CharField(max_length=1000, allow_blank=True, required=False)


class OrganizationSettingsSerializer(NonEmptySectionSerializer):
    name = serializers.CharField(max_length=150, required=False)
    timezone = serializers.CharField(
        max_length=64, required=False, validators=[validate_timezone]
    )


class BusinessSettingsSerializer(NonEmptySectionSerializer):
    businessName = serializers.CharField(
        max_length=150, allow_blank=True, required=False
    )
    postalCode = serializers.RegexField(
        re.compile(r"^(?:\d{3}-?\d{4})?$"),
        max_length=8,
        allow_blank=True,
        required=False,
    )
    prefecture = serializers.CharField(max_length=20, allow_blank=True, required=False)
    address = serializers.CharField(max_length=255, allow_blank=True, required=False)
    invoiceRegistrationNumber = serializers.RegexField(
        re.compile(r"^(?:T\d{13})?$"),
        max_length=14,
        allow_blank=True,
        required=False,
    )
    defaultTaxRate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
    )


class AppearanceSettingsSerializer(NonEmptySectionSerializer):
    timezone = serializers.CharField(
        max_length=64, required=False, validators=[validate_timezone]
    )
    weekStartsOn = serializers.ChoiceField(choices=WeekStartsOn.choices, required=False)
    timeFormat = serializers.ChoiceField(choices=TimeFormat.choices, required=False)
    compactMode = serializers.BooleanField(required=False)


class VersionsSerializer(serializers.Serializer):
    user = serializers.IntegerField(min_value=1, required=False)
    organization = serializers.IntegerField(min_value=1, required=False)
    business = serializers.IntegerField(min_value=1, required=False)


class SettingsUpdateSerializer(serializers.Serializer):
    profile = ProfileSettingsSerializer(required=False)
    organization = OrganizationSettingsSerializer(required=False)
    business = BusinessSettingsSerializer(required=False)
    appearance = AppearanceSettingsSerializer(required=False)
    versions = VersionsSerializer(required=True)

    def validate(self, attrs):
        sections = {"profile", "organization", "business", "appearance"}
        present = sections.intersection(attrs)
        if not present:
            raise serializers.ValidationError("更新対象を1つ以上指定してください。")
        versions = attrs["versions"]
        requirements = {
            "user": bool({"profile", "appearance"}.intersection(present)),
            "organization": "organization" in present,
            "business": "business" in present,
        }
        missing = [
            name
            for name, required in requirements.items()
            if required and name not in versions
        ]
        if missing:
            raise serializers.ValidationError(
                {"versions": {name: "versionは必須です。" for name in missing}}
            )
        return attrs
