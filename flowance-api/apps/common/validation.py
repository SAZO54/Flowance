from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

from rest_framework import serializers

from apps.common.error_codes import ValidationCode
from apps.common.error_messages import validation_message

PHONE_PATTERN = re.compile(r"^\+?[0-9]{10,15}$")
SETTINGS_PHONE_PATTERN = re.compile(r"^[0-9]{1,15}$")
POSTAL_CODE_PATTERN = re.compile(r"^[0-9]{7}$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


def validation_error(
    field: str, code: str, message: str | None = None
) -> serializers.ValidationError:
    return serializers.ValidationError(
        {field: serializers.ErrorDetail(message or validation_message(code), code=code)}
    )


def validate_optional_pattern(
    value: str | None,
    *,
    pattern: re.Pattern[str],
    code: str = ValidationCode.INVALID_FORMAT,
) -> str | None:
    if value in (None, ""):
        return value
    if not pattern.fullmatch(value):
        raise serializers.ValidationError(validation_message(code), code=code)
    return value


def validate_text_length(value: str | None, *, maximum: int) -> str | None:
    if value is not None and len(value) > maximum:
        raise serializers.ValidationError(
            validation_message(ValidationCode.MAX_LENGTH),
            code=ValidationCode.MAX_LENGTH,
        )
    return value


def validate_ordered_range(
    attrs: Mapping[str, Any],
    *,
    start_field: str,
    end_field: str,
    code: str,
    allow_equal: bool = False,
) -> None:
    start = attrs.get(start_field)
    end = attrs.get(end_field)
    if start is None or end is None:
        return
    valid = start <= end if allow_equal else start < end
    if not valid:
        raise validation_error(end_field, code)
