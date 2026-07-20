from rest_framework import serializers

from ..models import ContractStatus, ContractType, RoundingMethod


class ContractWriteSerializer(serializers.Serializer):
    contractType = serializers.ChoiceField(choices=ContractType.choices)
    currency = serializers.ChoiceField(choices=("JPY",), default="JPY", required=False)
    hourlyRate = serializers.IntegerField(min_value=0, allow_null=True, required=False)
    monthlyRate = serializers.IntegerField(min_value=0, allow_null=True, required=False)
    performanceAmount = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    minimumMinutes = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    maximumMinutes = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    baseMinutes = serializers.IntegerField(min_value=0, allow_null=True, required=False)
    deductionRate = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    overtimeRate = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    taxRate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100
    )
    withholdingTaxRate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100
    )
    roundingUnitMinutes = serializers.IntegerField(allow_null=True, required=False)
    roundingMethod = serializers.ChoiceField(
        choices=RoundingMethod.choices, allow_null=True, required=False
    )
    closingDay = serializers.IntegerField(
        min_value=1, max_value=31, allow_null=True, required=False
    )
    paymentTermsDays = serializers.IntegerField(
        min_value=0, allow_null=True, required=False
    )
    validFrom = serializers.DateField()
    validUntil = serializers.DateField(allow_null=True, required=False)
    status = serializers.ChoiceField(
        choices=ContractStatus.choices,
        default=ContractStatus.ACTIVE,
        required=False,
    )

    def model_data(self):
        values = self.validated_data
        return {
            "contract_type": values["contractType"],
            "currency": values.get("currency", "JPY"),
            "hourly_rate": values.get("hourlyRate"),
            "monthly_rate": values.get("monthlyRate"),
            "performance_amount": values.get("performanceAmount"),
            "minimum_minutes": values.get("minimumMinutes"),
            "maximum_minutes": values.get("maximumMinutes"),
            "base_minutes": values.get("baseMinutes"),
            "deduction_rate": values.get("deductionRate"),
            "overtime_rate": values.get("overtimeRate"),
            "tax_rate": values["taxRate"],
            "withholding_tax_rate": values["withholdingTaxRate"],
            "rounding_unit_minutes": values.get("roundingUnitMinutes"),
            "rounding_method": values.get("roundingMethod"),
            "closing_day": values.get("closingDay"),
            "payment_terms_days": values.get("paymentTermsDays"),
            "valid_from": values["validFrom"],
            "valid_until": values.get("validUntil"),
            "status": values.get("status", ContractStatus.ACTIVE),
        }


class ContractUpdateSerializer(ContractWriteSerializer):
    version = serializers.IntegerField(min_value=1)
