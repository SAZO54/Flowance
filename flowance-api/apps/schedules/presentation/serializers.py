from rest_framework import serializers

from ..models import WeeklyScheduleStatus


class WeeklyScheduleWriteSerializer(serializers.Serializer):
    userId = serializers.UUIDField()
    dayOfWeek = serializers.IntegerField(min_value=0, max_value=6)
    startTime = serializers.TimeField()
    endTime = serializers.TimeField()
    breakMinutes = serializers.IntegerField(min_value=0)
    validFrom = serializers.DateField()
    validUntil = serializers.DateField(allow_null=True, required=False)
    status = serializers.ChoiceField(
        choices=WeeklyScheduleStatus.choices,
        default=WeeklyScheduleStatus.ACTIVE,
        required=False,
    )

    def model_data(self):
        values = self.validated_data
        return {
            "user_id": values["userId"],
            "day_of_week": values["dayOfWeek"],
            "start_time": values["startTime"],
            "end_time": values["endTime"],
            "break_minutes": values["breakMinutes"],
            "valid_from": values["validFrom"],
            "valid_until": values.get("validUntil"),
            "status": values.get("status", WeeklyScheduleStatus.ACTIVE),
        }


class WeeklyScheduleUpdateSerializer(WeeklyScheduleWriteSerializer):
    version = serializers.IntegerField(min_value=1)


class WeeklyScheduleBulkSerializer(serializers.Serializer):
    items = WeeklyScheduleWriteSerializer(many=True, allow_empty=False)

    def validate_items(self, value):
        if len(value) > 50:
            raise serializers.ValidationError(
                "一度に登録できる週次予定は50件までです。"
            )
        return value

    def model_items(self):
        return [
            {
                "user_id": item["userId"],
                "day_of_week": item["dayOfWeek"],
                "start_time": item["startTime"],
                "end_time": item["endTime"],
                "break_minutes": item["breakMinutes"],
                "valid_from": item["validFrom"],
                "valid_until": item.get("validUntil"),
                "status": item.get("status", WeeklyScheduleStatus.ACTIVE),
            }
            for item in self.validated_data["items"]
        ]


class WorkScheduleWriteSerializer(serializers.Serializer):
    projectId = serializers.UUIDField()
    title = serializers.CharField(max_length=150)
    scheduledStartAt = serializers.DateTimeField()
    scheduledEndAt = serializers.DateTimeField()
    notes = serializers.CharField(allow_null=True, allow_blank=True, required=False)

    def model_data(self):
        values = self.validated_data
        return {
            "project_id": values["projectId"],
            "title": values["title"],
            "scheduled_start_at": values["scheduledStartAt"],
            "scheduled_end_at": values["scheduledEndAt"],
            "notes": values.get("notes"),
        }


class WorkScheduleUpdateSerializer(WorkScheduleWriteSerializer):
    version = serializers.IntegerField(min_value=1)


class GenerateWorkSchedulesSerializer(serializers.Serializer):
    projectId = serializers.UUIDField()
    fromDate = serializers.DateField()
    toDate = serializers.DateField()
    weeklyScheduleIds = serializers.ListField(
        child=serializers.UUIDField(),
        allow_null=True,
        required=False,
        max_length=50,
    )
    dryRun = serializers.BooleanField(default=False, required=False)


class DateTimeRangeQuerySerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["from"] = serializers.DateTimeField()
        self.fields["to"] = serializers.DateTimeField()
        self.fields["projectId"] = serializers.UUIDField(required=False)


class CalendarQuerySerializer(DateTimeRangeQuerySerializer):
    mode = serializers.ChoiceField(
        choices=("planned", "actual", "both"), default="both", required=False
    )
    projectIds = serializers.CharField(required=False, allow_blank=True)
    userIds = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
