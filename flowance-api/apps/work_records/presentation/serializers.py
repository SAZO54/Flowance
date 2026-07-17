from rest_framework import serializers

from ..models import WorkRecordStatus


class BreakPeriodSerializer(serializers.Serializer):
    startAt = serializers.DateTimeField()
    endAt = serializers.DateTimeField()


class WorkRecordWriteSerializer(serializers.Serializer):
    projectId = serializers.UUIDField()
    workScheduleId = serializers.UUIDField(allow_null=True, required=False)
    actualStartAt = serializers.DateTimeField()
    actualEndAt = serializers.DateTimeField()
    breaks = BreakPeriodSerializer(many=True, allow_empty=True)
    isBillable = serializers.BooleanField()
    status = serializers.ChoiceField(choices=WorkRecordStatus.choices)
    notes = serializers.CharField(allow_null=True, allow_blank=True, required=False)

    def validate(self, attrs):
        forbidden = {
            "actualMinutes",
            "breakMinutes",
            "billableMinutes",
        }.intersection(self.initial_data)
        if forbidden:
            raise serializers.ValidationError(
                {
                    field: "この項目はバックエンドで計算されます。"
                    for field in sorted(forbidden)
                }
            )
        return attrs

    def model_data(self):
        values = self.validated_data
        return {
            "project_id": values["projectId"],
            "work_schedule_id": values.get("workScheduleId"),
            "actual_start_at": values["actualStartAt"],
            "actual_end_at": values["actualEndAt"],
            "breaks": [(item["startAt"], item["endAt"]) for item in values["breaks"]],
            "is_billable": values["isBillable"],
            "status": values["status"],
            "notes": values.get("notes"),
        }


class WorkRecordUpdateSerializer(WorkRecordWriteSerializer):
    version = serializers.IntegerField(min_value=1)


class WorkRecordListQuerySerializer(serializers.Serializer):
    projectId = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=WorkRecordStatus.choices, required=False)
    page = serializers.IntegerField(min_value=1, default=1)
    pageSize = serializers.IntegerField(min_value=1, max_value=100, default=20)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["from"] = serializers.DateTimeField(required=False)
        self.fields["to"] = serializers.DateTimeField(required=False)
