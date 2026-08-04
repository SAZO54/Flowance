from decimal import Decimal

from django.test import SimpleTestCase

from apps.settlements.domain.calculation import (
    InvalidContractConfigurationError,
    NegativeSettlementTotalError,
    SettlementContractTerms,
    calculate_amounts,
)


class SettlementCalculationTests(SimpleTestCase):
    def terms(self, contract_type: str, **overrides):
        values = {
            "contract_type": contract_type,
            "hourly_rate": None,
            "monthly_rate": None,
            "base_minutes": None,
            "deduction_rate": None,
            "overtime_rate": None,
            "performance_amount": None,
            "tax_rate": Decimal("10.00"),
            "withholding_tax_rate": Decimal("10.21"),
        }
        values.update(overrides)
        return SettlementContractTerms(**values)

    def test_hourly_contract_calculates_tax_withholding_and_floor_rounding(self):
        result = calculate_amounts(
            contract_terms=self.terms("HOURLY", hourly_rate=5555),
            target_minutes=125,
        )

        self.assertEqual(result.base_amount, 11572)
        self.assertEqual(result.tax_amount, 1157)
        self.assertEqual(result.withholding_amount, 1181)
        self.assertEqual(result.total_amount, 11548)

    def test_monthly_range_uses_base_minutes_difference_for_deduction(self):
        result = calculate_amounts(
            contract_terms=self.terms(
                "MONTHLY_RANGE",
                monthly_rate=500000,
                base_minutes=9600,
                deduction_rate=3000,
                overtime_rate=4000,
                withholding_tax_rate=Decimal("0"),
            ),
            target_minutes=9000,
        )

        self.assertEqual(result.deduction_amount, 30000)
        self.assertEqual(result.overtime_amount, 0)
        self.assertEqual(result.base_amount, 470000)
        self.assertEqual(result.total_amount, 517000)

    def test_monthly_range_uses_base_minutes_difference_for_overtime(self):
        result = calculate_amounts(
            contract_terms=self.terms(
                "MONTHLY_RANGE",
                monthly_rate=500000,
                base_minutes=9600,
                deduction_rate=3000,
                overtime_rate=4500,
                tax_rate=Decimal("0"),
                withholding_tax_rate=Decimal("0"),
            ),
            target_minutes=9900,
        )

        self.assertEqual(result.deduction_amount, 0)
        self.assertEqual(result.overtime_amount, 22500)
        self.assertEqual(result.base_amount, 522500)
        self.assertEqual(result.total_amount, 522500)

    def test_monthly_fixed_ignores_target_minutes(self):
        result = calculate_amounts(
            contract_terms=self.terms("MONTHLY_FIXED", monthly_rate=300000),
            target_minutes=0,
        )

        self.assertEqual(result.base_amount, 300000)
        self.assertEqual(result.tax_amount, 30000)
        self.assertEqual(result.withholding_amount, 30630)
        self.assertEqual(result.total_amount, 299370)

    def test_performance_uses_performance_amount(self):
        result = calculate_amounts(
            contract_terms=self.terms("PERFORMANCE", performance_amount=120000),
            target_minutes=9999,
        )

        self.assertEqual(result.base_amount, 120000)
        self.assertEqual(result.total_amount, 119748)

    def test_missing_required_contract_value_is_invalid(self):
        with self.assertRaises(InvalidContractConfigurationError):
            calculate_amounts(
                contract_terms=self.terms("HOURLY", hourly_rate=None),
                target_minutes=60,
            )

    def test_negative_base_amount_is_invalid(self):
        with self.assertRaises(NegativeSettlementTotalError):
            calculate_amounts(
                contract_terms=self.terms(
                    "MONTHLY_RANGE",
                    monthly_rate=10000,
                    base_minutes=9600,
                    deduction_rate=10000,
                    overtime_rate=10000,
                ),
                target_minutes=0,
            )
