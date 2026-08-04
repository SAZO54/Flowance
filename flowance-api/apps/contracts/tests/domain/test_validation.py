from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from apps.contracts.domain.validation import (
    InvalidContractConditionError,
    validate_contract_conditions,
)
from apps.contracts.models import ContractType


class ContractConditionValidationTests(SimpleTestCase):
    def base_values(self, **overrides):
        values = {
            "contract_type": ContractType.HOURLY,
            "currency": "JPY",
            "hourly_rate": 5000,
            "monthly_rate": None,
            "performance_amount": None,
            "minimum_minutes": None,
            "maximum_minutes": None,
            "base_minutes": None,
            "deduction_rate": None,
            "overtime_rate": None,
            "rounding_unit_minutes": 15,
            "rounding_method": "ROUND_DOWN",
            "tax_rate": Decimal("10.00"),
            "withholding_tax_rate": Decimal("10.21"),
            "closing_day": 31,
            "valid_from": date(2026, 7, 1),
            "valid_until": date(2026, 7, 1),
        }
        values.update(overrides)
        return values

    def assert_invalid_fields(self, values, fields):
        with self.assertRaises(InvalidContractConditionError) as caught:
            validate_contract_conditions(values)
        self.assertEqual(
            {detail["field"] for detail in caught.exception.details},
            set(fields),
        )

    def test_valid_from_and_valid_until_may_be_same_day(self):
        validate_contract_conditions(self.base_values())

    def test_valid_until_before_valid_from_is_invalid(self):
        self.assert_invalid_fields(
            self.base_values(valid_until=date(2026, 6, 30)),
            {"validUntil"},
        )

    def test_hourly_requires_rate_and_rejects_monthly_only_fields(self):
        self.assert_invalid_fields(
            self.base_values(hourly_rate=None, monthly_rate=300000),
            {"hourlyRate", "monthlyRate"},
        )

    def test_monthly_range_base_minutes_must_stay_inside_range(self):
        self.assert_invalid_fields(
            self.base_values(
                contract_type=ContractType.MONTHLY_RANGE,
                hourly_rate=None,
                monthly_rate=500000,
                minimum_minutes=9000,
                maximum_minutes=9600,
                base_minutes=10000,
                deduction_rate=3000,
                overtime_rate=4000,
            ),
            {"baseMinutes"},
        )

    def test_rounding_unit_method_tax_and_closing_day_boundaries(self):
        self.assert_invalid_fields(
            self.base_values(
                rounding_unit_minutes=7,
                rounding_method="BANKERS",
                tax_rate=Decimal("101.00"),
                withholding_tax_rate=Decimal("-0.01"),
                closing_day=32,
            ),
            {
                "roundingUnitMinutes",
                "roundingMethod",
                "taxRate",
                "withholdingTaxRate",
                "closingDay",
            },
        )
