from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from apps.common.domain.errors import DomainValidationError
from apps.common.error_codes import ErrorCode


class InvalidScheduleTimeRangeError(DomainValidationError):
    code = ErrorCode.INVALID_SCHEDULE_TIME_RANGE


class InvalidBreakMinutesError(DomainValidationError):
    code = ErrorCode.INVALID_BREAK_MINUTES


class InvalidScheduleDateRangeError(DomainValidationError):
    code = ErrorCode.INVALID_SCHEDULE_DATE_RANGE


class ScheduleGenerationRangeTooLargeError(DomainValidationError):
    code = ErrorCode.SCHEDULE_GENERATION_RANGE_TOO_LARGE


class ScheduleGenerationLimitExceededError(DomainValidationError):
    code = ErrorCode.SCHEDULE_GENERATION_LIMIT_EXCEEDED


@dataclass(frozen=True, slots=True)
class WeeklyTemplate:
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    break_minutes: int
    valid_from: date
    valid_until: date | None


@dataclass(frozen=True, slots=True)
class ScheduleCandidate:
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    weekly_schedule_id: uuid.UUID
    title: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    break_minutes: int


def validate_weekly_schedule(
    *,
    start_time: time,
    end_time: time,
    break_minutes: int,
    valid_from: date,
    valid_until: date | None,
) -> None:
    if start_time >= end_time:
        raise InvalidScheduleTimeRangeError()
    duration = (
        datetime.combine(date.min, end_time) - datetime.combine(date.min, start_time)
    ).total_seconds() // 60
    if break_minutes < 0 or break_minutes >= duration:
        raise InvalidBreakMinutesError()
    if valid_until is not None and valid_from > valid_until:
        raise InvalidScheduleDateRangeError()


def validate_work_schedule(
    *,
    scheduled_start_at: datetime,
    scheduled_end_at: datetime,
    break_minutes: int,
) -> None:
    if scheduled_start_at >= scheduled_end_at:
        raise InvalidScheduleTimeRangeError()
    duration = (scheduled_end_at - scheduled_start_at).total_seconds() // 60
    if break_minutes < 0 or break_minutes >= duration:
        raise InvalidBreakMinutesError()


def document_day_of_week(value: date) -> int:
    return (value.weekday() + 1) % 7


def expand_weekly_templates(
    *,
    templates: list[WeeklyTemplate],
    from_date: date,
    to_date: date,
    timezone_name: str,
    project_name: str,
) -> list[ScheduleCandidate]:
    days = (to_date - from_date).days + 1
    if days <= 0:
        raise InvalidScheduleDateRangeError()
    if days > 100:
        raise ScheduleGenerationRangeTooLargeError()
    if len(templates) > 50:
        raise ScheduleGenerationLimitExceededError(
            "一度に指定できる週次予定は50件までです。"
        )

    timezone = ZoneInfo(timezone_name)
    candidates: list[ScheduleCandidate] = []
    current = from_date
    while current <= to_date:
        day_of_week = document_day_of_week(current)
        for template in templates:
            if template.day_of_week != day_of_week:
                continue
            if current < template.valid_from:
                continue
            if template.valid_until is not None and current > template.valid_until:
                continue
            candidates.append(
                ScheduleCandidate(
                    id=uuid.uuid4(),
                    project_id=template.project_id,
                    user_id=template.user_id,
                    weekly_schedule_id=template.id,
                    title=project_name,
                    scheduled_start_at=datetime.combine(
                        current, template.start_time, timezone
                    ),
                    scheduled_end_at=datetime.combine(
                        current, template.end_time, timezone
                    ),
                    break_minutes=template.break_minutes,
                )
            )
            if len(candidates) > 300:
                raise ScheduleGenerationLimitExceededError()
        current += timedelta(days=1)
    return candidates


def overlaps(
    start_at: datetime,
    end_at: datetime,
    other_start_at: datetime,
    other_end_at: datetime,
) -> bool:
    return other_start_at < end_at and start_at < other_end_at
