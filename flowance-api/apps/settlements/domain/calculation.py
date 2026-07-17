"""Framework-independent monthly settlement calculation."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_FLOOR

from apps.common.exceptions import DomainValidationError


class InvalidContractConfigurationError(DomainValidationError):
    code = "INVALID_CONTRACT_CONFIGURATION"
    default_message = "契約の計算条件が不足しています。"


class NegativeSettlementTotalError(DomainValidationError):
    code = "NEGATIVE_SETTLEMENT_TOTAL"
    default_message = "精算金額が負になるため計算できません。"


@dataclass(frozen=True)
class SettlementAmounts:
    base_amount: int
    deduction_amount: int
    overtime_amount: int
    tax_amount: int
    withholding_amount: int
    total_amount: int


def _yen(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_FLOOR))


def calculate_amounts(*, contract, target_minutes: int) -> SettlementAmounts:
    contract_type = contract.contract_type
    deduction_amount = 0
    overtime_amount = 0

    if contract_type == "HOURLY":
        if contract.hourly_rate is None:
            raise InvalidContractConfigurationError()
        base_amount = _yen(
            Decimal(target_minutes) * Decimal(contract.hourly_rate) / Decimal(60)
        )
    elif contract_type == "MONTHLY_RANGE":
        required = (
            contract.monthly_rate,
            contract.base_minutes,
            contract.deduction_rate,
            contract.overtime_rate,
        )
        if any(value is None for value in required):
            raise InvalidContractConfigurationError()
        shortage = max(contract.base_minutes - target_minutes, 0)
        excess = max(target_minutes - contract.base_minutes, 0)
        deduction_amount = _yen(
            Decimal(shortage) * Decimal(contract.deduction_rate) / Decimal(60)
        )
        overtime_amount = _yen(
            Decimal(excess) * Decimal(contract.overtime_rate) / Decimal(60)
        )
        base_amount = contract.monthly_rate - deduction_amount + overtime_amount
    elif contract_type == "MONTHLY_FIXED":
        if contract.monthly_rate is None:
            raise InvalidContractConfigurationError()
        base_amount = contract.monthly_rate
    elif contract_type == "PERFORMANCE":
        if contract.performance_amount is None:
            raise InvalidContractConfigurationError()
        base_amount = contract.performance_amount
    else:
        raise InvalidContractConfigurationError()

    if base_amount < 0:
        raise NegativeSettlementTotalError()
    tax_amount = _yen(Decimal(base_amount) * contract.tax_rate / Decimal(100))
    withholding_amount = _yen(
        Decimal(base_amount) * contract.withholding_tax_rate / Decimal(100)
    )
    total_amount = base_amount + tax_amount - withholding_amount
    if total_amount < 0:
        raise NegativeSettlementTotalError()
    return SettlementAmounts(
        base_amount=base_amount,
        deduction_amount=deduction_amount,
        overtime_amount=overtime_amount,
        tax_amount=tax_amount,
        withholding_amount=withholding_amount,
        total_amount=total_amount,
    )
