from dataclasses import dataclass
from decimal import Decimal, ROUND_FLOOR

from apps.common.domain.errors import DomainValidationError


class InvalidContractConfigurationError(DomainValidationError):
    code = "INVALID_CONTRACT_CONFIGURATION"
    default_message = "契約の計算条件が不足しています。"


class NegativeSettlementTotalError(DomainValidationError):
    code = "NEGATIVE_SETTLEMENT_TOTAL"
    default_message = "精算金額が負になるため計算できません。"


@dataclass(frozen=True)
class SettlementContractTerms:
    contract_type: str
    hourly_rate: int | None
    monthly_rate: int | None
    base_minutes: int | None
    deduction_rate: int | None
    overtime_rate: int | None
    performance_amount: int | None
    tax_rate: Decimal
    withholding_tax_rate: Decimal


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


def calculate_amounts(
    *, contract_terms: SettlementContractTerms, target_minutes: int
) -> SettlementAmounts:
    contract_type = contract_terms.contract_type
    deduction_amount = 0
    overtime_amount = 0

    if contract_type == "HOURLY":
        if contract_terms.hourly_rate is None:
            raise InvalidContractConfigurationError()
        base_amount = _yen(
            Decimal(target_minutes) * Decimal(contract_terms.hourly_rate) / Decimal(60)
        )
    elif contract_type == "MONTHLY_RANGE":
        required = (
            contract_terms.monthly_rate,
            contract_terms.base_minutes,
            contract_terms.deduction_rate,
            contract_terms.overtime_rate,
        )
        if any(value is None for value in required):
            raise InvalidContractConfigurationError()
        shortage = max(contract_terms.base_minutes - target_minutes, 0)
        excess = max(target_minutes - contract_terms.base_minutes, 0)
        deduction_amount = _yen(
            Decimal(shortage) * Decimal(contract_terms.deduction_rate) / Decimal(60)
        )
        overtime_amount = _yen(
            Decimal(excess) * Decimal(contract_terms.overtime_rate) / Decimal(60)
        )
        base_amount = contract_terms.monthly_rate - deduction_amount + overtime_amount
    elif contract_type == "MONTHLY_FIXED":
        if contract_terms.monthly_rate is None:
            raise InvalidContractConfigurationError()
        base_amount = contract_terms.monthly_rate
    elif contract_type == "PERFORMANCE":
        if contract_terms.performance_amount is None:
            raise InvalidContractConfigurationError()
        base_amount = contract_terms.performance_amount
    else:
        raise InvalidContractConfigurationError()

    if base_amount < 0:
        raise NegativeSettlementTotalError()
    tax_amount = _yen(Decimal(base_amount) * contract_terms.tax_rate / Decimal(100))
    withholding_amount = _yen(
        Decimal(base_amount) * contract_terms.withholding_tax_rate / Decimal(100)
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
