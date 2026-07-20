export type SchedulePeriod = 'week' | 'month'

export type CalendarRange = {
  from: string
  to: string
}

export type GetCalendarRangeInput = {
  /** Calendar anchor in YYYY-MM-DD format. */
  anchorDate: string
  period: SchedulePeriod
  /** User timezone offset. Phase1 primarily targets Asia/Tokyo. */
  utcOffset?: string
  weekStartsOn?: 'MONDAY' | 'SUNDAY'
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const OFFSET_PATTERN = /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/

function parseDate(value: string): Date {
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new Error('anchorDate must use YYYY-MM-DD format.')

  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('anchorDate must be a valid calendar date.')
  }

  return date
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date, utcOffset: string): string {
  return new Date(`${formatDate(date)}T00:00:00${utcOffset}`).toISOString()
}

/**
 * Produces a half-open [from, to) API range using Monday as the first day of
 * the week. UTC date arithmetic keeps the result independent of the browser or
 * Node process timezone.
 */
export function getCalendarRange({
  anchorDate,
  period,
  utcOffset = '+09:00',
  weekStartsOn = 'MONDAY',
}: GetCalendarRangeInput): CalendarRange {
  if (!OFFSET_PATTERN.test(utcOffset)) {
    throw new Error('utcOffset must use +HH:MM or -HH:MM format.')
  }

  const anchor = parseDate(anchorDate)
  let from: Date
  let to: Date

  if (period === 'week') {
    from = new Date(anchor)
    const daysSinceWeekStart = weekStartsOn === 'SUNDAY'
      ? anchor.getUTCDay()
      : (anchor.getUTCDay() + 6) % 7
    from.setUTCDate(anchor.getUTCDate() - daysSinceWeekStart)
    to = new Date(from)
    to.setUTCDate(from.getUTCDate() + 7)
  } else {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1))
  }

  return {
    from: startOfDay(from, utcOffset),
    to: startOfDay(to, utcOffset),
  }
}

