from rest_framework import serializers

from ..models import ProjectStatus


class ProjectWriteSerializer(serializers.Serializer):
    clientId = serializers.UUIDField()
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(
        allow_null=True, allow_blank=True, required=False
    )
    labelColor = serializers.RegexField(
        regex=r"^#[0-9A-Fa-f]{6}$", default="#3B82F6", required=False
    )
    startDate = serializers.DateField(allow_null=True, required=False)
    endDate = serializers.DateField(allow_null=True, required=False)
    workloadRate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
    )
    status = serializers.ChoiceField(choices=ProjectStatus.choices)
    notes = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    iconFile = serializers.FileField(required=False, write_only=True)

    def validate(self, attrs):
        start_date = attrs.get("startDate")
        end_date = attrs.get("endDate")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"endDate": "終了日は開始日以降を指定してください。"}
            )
        return attrs

    def model_data(self):
        values = self.validated_data
        return {
            "client_id": values["clientId"],
            "name": values["name"],
            "description": values.get("description"),
            "label_color": values.get("labelColor", "#3B82F6"),
            "start_date": values.get("startDate"),
            "end_date": values.get("endDate"),
            "workload_rate": values.get("workloadRate"),
            "status": values["status"],
            "notes": values.get("notes"),
        }


class ProjectUpdateSerializer(ProjectWriteSerializer):
    version = serializers.IntegerField(min_value=1)
    iconAction = serializers.ChoiceField(
        choices=("KEEP", "DELETE"), default="KEEP", required=False
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs.get("iconFile") and attrs.get("iconAction") == "DELETE":
            raise serializers.ValidationError(
                {"iconAction": "iconFileとDELETEは同時に指定できません。"}
            )
        return attrs


class ProjectListQuerySerializer(serializers.Serializer):
    query = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=ProjectStatus.choices, required=False)
    page = serializers.IntegerField(min_value=1, default=1)
    pageSize = serializers.IntegerField(min_value=1, max_value=100, default=20)
    sort = serializers.ChoiceField(
        choices=("name", "-name", "updatedAt", "-updatedAt", "revenue", "-revenue"),
        default="name",
    )
