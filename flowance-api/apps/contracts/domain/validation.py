from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal
from typing import Any

from apps.common.domain.errors import DomainValidationError
from apps.common.error_codes import ErrorCode


class InvalidContractConditionError(DomainValidationError):
    code = ErrorCode.INVALID_CONTRACT_CONDITION


CONTRACT_TYPES = {"HOURLY", "MONTHLY_RANGE", "MONTHLY_FIXED", "PERFORMANCE"}
ROUNDING_METHODS = {"ROUND_DOWN", "ROUND_UP", "ROUND_HALF_UP"}
ROUNDING_UNITS = {1, 5, 10, 15, 30, 60}
CONDITION_FIELDS = {
    "hourly_rate",
    "monthly_rate",
    "performance_amount",
    "minimum_minutes",
    "maximum_minutes",
    "base_minutes",
    "deduction_rate",
    "overtime_rate",
    "rounding_unit_minutes",
    "rounding_method",
}
REQUIRED_BY_TYPE = {
    "HOURLY": {"hourly_rate", "rounding_unit_minutes", "rounding_method"},
    "MONTHLY_RANGE": {
        "monthly_rate",
        "minimum_minutes",
        "maximum_minutes",
        "base_minutes",
        "deduction_rate",
        "overtime_rate",
        "rounding_unit_minutes",
        "rounding_method",
    },
    "MONTHLY_FIXED": {"monthly_rate"},
    "PERFORMANCE": {"performance_amount"},
}


def _camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.title() for part in tail)


def _detail(field: str, message: str, code: str = "INVALID") -> dict[str, str]:
    return {"field": field, "code": code, "message": message}


def validate_contract_conditions(values: Mapping[str, Any]) -> None:
    details: list[dict[str, str]] = []
    contract_type = values.get("contract_type")
    if contract_type not in CONTRACT_TYPES:
        details.append(_detail("contractType", "対応していない契約形態です。"))
    else:
        required = REQUIRED_BY_TYPE[contract_type]
        for field in sorted(required):
            if values.get(field) is None:
                details.append(
                    _detail(_camel(field), "この契約形態では必須です。", "REQUIRED")
                )
        for field in sorted(CONDITION_FIELDS - required):
            if values.get(field) is not None:
                details.append(
                    _detail(
                        _camel(field),
                        "この契約形態では指定できません。",
                        "NOT_APPLICABLE",
                    )
                )

    if values.get("currency") != "JPY":
        details.append(_detail("currency", "Phase1ではJPYのみ指定できます。"))
    valid_from, valid_until = values.get("valid_from"), values.get("valid_until")
    if valid_from and valid_until and valid_from > valid_until:
        details.append(
            _detail("validUntil", "契約終了日は開始日以降を指定してください。")
        )

    minimum = values.get("minimum_minutes")
    maximum = values.get("maximum_minutes")
    base = values.get("base_minutes")
    if minimum is not None and maximum is not None and minimum > maximum:
        details.append(
            _detail("maximumMinutes", "最大時間は最低時間以上を指定してください。")
        )
    if base is not None and minimum is not None and base < minimum:
        details.append(
            _detail("baseMinutes", "基準時間は最低時間以上を指定してください。")
        )
    if base is not None and maximum is not None and base > maximum:
        details.append(
            _detail("baseMinutes", "基準時間は最大時間以下を指定してください。")
        )

    unit = values.get("rounding_unit_minutes")
    if unit is not None and unit not in ROUNDING_UNITS:
        details.append(
            _detail(
                "roundingUnitMinutes", "1、5、10、15、30、60分から選択してください。"
            )
        )
    method = values.get("rounding_method")
    if method is not None and method not in ROUNDING_METHODS:
        details.append(_detail("roundingMethod", "丸め方式を確認してください。"))
    for field in ("tax_rate", "withholding_tax_rate"):
        rate = values.get(field)
        if rate is not None and not Decimal("0") <= Decimal(rate) <= Decimal("100"):
            details.append(_detail(_camel(field), "0から100の範囲で指定してください。"))
    closing_day = values.get("closing_day")
    if closing_day is not None and not 1 <= closing_day <= 31:
        details.append(_detail("closingDay", "1から31の範囲で指定してください。"))
    if details:
        raise InvalidContractConditionError(details=details)
