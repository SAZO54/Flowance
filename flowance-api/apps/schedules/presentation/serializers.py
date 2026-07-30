from datetime import date, datetime

from rest_framework import serializers

from apps.common.error_codes import ValidationCode
from apps.common.error_messages import validation_message
from apps.common.validation import validate_ordered_range, validation_error

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

    def validate(self, attrs):
        validate_ordered_range(
            attrs,
            start_field="startTime",
            end_field="endTime",
            code=ValidationCode.INVALID_TIME_RANGE,
        )
        validate_ordered_range(
            attrs,
            start_field="validFrom",
            end_field="validUntil",
            code=ValidationCode.INVALID_DATE_RANGE,
            allow_equal=True,
        )
        start_time = attrs.get("startTime")
        end_time = attrs.get("endTime")
        break_minutes = attrs.get("breakMinutes")
        if start_time and end_time and break_minutes is not None:
            duration = datetime.combine(date.min, end_time) - datetime.combine(
                date.min, start_time
            )
            if break_minutes > duration.total_seconds() // 60:
                raise validation_error(
                    "breakMinutes",
                    ValidationCode.SCHEDULE_BREAK_TOO_LONG,
                )
        return attrs

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
                validation_message(ValidationCode.MAX_VALUE),
                code=ValidationCode.MAX_VALUE,
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
    title = serializers.CharField(max_length=200)
    scheduledStartAt = serializers.DateTimeField()
    scheduledEndAt = serializers.DateTimeField()
    notes = serializers.CharField(
        max_length=1000, allow_null=True, allow_blank=True, required=False
    )

    def validate(self, attrs):
        validate_ordered_range(
            attrs,
            start_field="scheduledStartAt",
            end_field="scheduledEndAt",
            code=ValidationCode.INVALID_TIME_RANGE,
        )
        return attrs

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

    def validate(self, attrs):
        validate_ordered_range(
            attrs,
            start_field="fromDate",
            end_field="toDate",
            code=ValidationCode.INVALID_DATE_RANGE,
            allow_equal=True,
        )
        from_date = attrs.get("fromDate")
        to_date = attrs.get("toDate")
        if from_date and to_date and (to_date - from_date).days > 100:
            raise validation_error(
                "toDate",
                ValidationCode.GENERATION_RANGE_TOO_LARGE,
            )
        return attrs


class DateTimeRangeQuerySerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["from"] = serializers.DateTimeField()
        self.fields["to"] = serializers.DateTimeField()
        self.fields["projectId"] = serializers.UUIDField(required=False)

    def validate(self, attrs):
        validate_ordered_range(
            attrs,
            start_field="from",
            end_field="to",
            code=ValidationCode.INVALID_TIME_RANGE,
        )
        return attrs


class CalendarQuerySerializer(DateTimeRangeQuerySerializer):
    mode = serializers.ChoiceField(
        choices=("planned", "actual", "both"), default="both", required=False
    )
    projectIds = serializers.CharField(required=False, allow_blank=True)
    userIds = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
