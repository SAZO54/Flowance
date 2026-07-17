from datetime import date

from rest_framework import serializers

from ..models import CalculationBasis


class SettlementCalculateSerializer(serializers.Serializer):
    projectId = serializers.UUIDField()
    settlementMonth = serializers.RegexField(r"^\d{4}-(0[1-9]|1[0-2])$")
    calculationBasis = serializers.ChoiceField(choices=CalculationBasis.choices)

    def month(self):
        year, month = map(int, self.validated_data["settlementMonth"].split("-"))
        return date(year, month, 1)


class VersionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
