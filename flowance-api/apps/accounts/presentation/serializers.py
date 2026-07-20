from types import SimpleNamespace
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        min_length=12,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
    displayName = serializers.CharField(max_length=100)
    organizationName = serializers.CharField(max_length=150)
    timezone = serializers.CharField(max_length=64)

    def validate_timezone(self, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError(
                "有効なIANAタイムゾーンを指定してください。", code="invalid"
            ) from exc
        return value

    def validate(self, attrs):
        candidate = SimpleNamespace(
            email=attrs["email"],
            display_name=attrs["displayName"],
        )
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
