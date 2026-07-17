"""Pure work-time validation and minute calculation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP, ROUND_UP

from apps.common.exceptions import DomainValidationError


class InvalidWorkRecordTimeRangeError(DomainValidationError):
    code = "INVALID_WORK_RECORD_TIME_RANGE"
    default_message = "実績終了日時は実績開始日時より後にしてください。"


class InvalidBreakPeriodError(DomainValidationError):
    code = "INVALID_BREAK_PERIOD"
    default_message = "休憩終了日時は休憩開始日時より後にしてください。"


class BreakOutsideWorkRecordError(DomainValidationError):
    code = "BREAK_OUTSIDE_WORK_RECORD"
    default_message = "休憩時間は実績時間内に指定してください。"


class BreakPeriodOverlapError(DomainValidationError):
    code = "BREAK_PERIOD_OVERLAP"
    default_message = "休憩時間同士を重複させることはできません。"


class InvalidRoundingRuleError(DomainValidationError):
    code = "INVALID_ROUNDING_RULE"
    default_message = "契約の時間丸め設定が正しくありません。"


@dataclass(frozen=True, slots=True)
class BreakPeriod:
    start_at: datetime
    end_at: datetime
    minutes: int


@dataclass(frozen=True, slots=True)
class WorkTimeCalculation:
    gross_minutes: int
    break_minutes: int
    actual_minutes: int
    billable_minutes: int
    breaks: tuple[BreakPeriod, ...]


def _minutes_between(start_at: datetime, end_at: datetime) -> int:
    return int((end_at - start_at).total_seconds() // 60)


def round_minutes(minutes: int, unit: int | None, method: str | None) -> int:
    if not unit or not method:
        return minutes
    if unit <= 0:
        raise InvalidRoundingRuleError()
    rounding = {
        "ROUND_DOWN": ROUND_DOWN,
        "ROUND_UP": ROUND_UP,
        "ROUND_HALF_UP": ROUND_HALF_UP,
    }.get(method)
    if rounding is None:
        raise InvalidRoundingRuleError()
    units = (Decimal(minutes) / Decimal(unit)).quantize(Decimal("1"), rounding=rounding)
    return int(units * Decimal(unit))


def calculate_work_time(
    *,
    actual_start_at: datetime,
    actual_end_at: datetime,
    breaks: list[tuple[datetime, datetime]],
    is_billable: bool,
    rounding_unit_minutes: int | None = None,
    rounding_method: str | None = None,
) -> WorkTimeCalculation:
    if actual_start_at >= actual_end_at:
        raise InvalidWorkRecordTimeRangeError()

    calculated_breaks: list[BreakPeriod] = []
    previous_end: datetime | None = None
    for start_at, end_at in sorted(breaks, key=lambda value: value[0]):
        if start_at >= end_at:
            raise InvalidBreakPeriodError()
        if start_at < actual_start_at or end_at > actual_end_at:
            raise BreakOutsideWorkRecordError()
        if previous_end is not None and start_at < previous_end:
            raise BreakPeriodOverlapError()
        calculated_breaks.append(
            BreakPeriod(
                start_at=start_at,
                end_at=end_at,
                minutes=_minutes_between(start_at, end_at),
            )
        )
        previous_end = end_at

    gross_minutes = _minutes_between(actual_start_at, actual_end_at)
    break_minutes = sum(item.minutes for item in calculated_breaks)
    actual_minutes = gross_minutes - break_minutes
    if actual_minutes < 0:
        raise BreakOutsideWorkRecordError()
    billable_minutes = (
        round_minutes(actual_minutes, rounding_unit_minutes, rounding_method)
        if is_billable
        else 0
    )
    return WorkTimeCalculation(
        gross_minutes=gross_minutes,
        break_minutes=break_minutes,
        actual_minutes=actual_minutes,
        billable_minutes=billable_minutes,
        breaks=tuple(calculated_breaks),
    )
