export type DateTimePreferences = {
  timezone: string
  weekStartsOn: 'MONDAY' | 'SUNDAY'
  timeFormat: 'H24' | 'H12'
}

const part = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => parts.find(item => item.type === type)?.value ?? ''

export function dateKeyInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
}

export function timeZoneOffset(timezone: string, dateValue: string): string {
  const reference = new Date(`${dateValue}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(reference)
  const representedAsUtc = Date.UTC(
    Number(part(parts, 'year')),
    Number(part(parts, 'month')) - 1,
    Number(part(parts, 'day')),
    Number(part(parts, 'hour')),
    Number(part(parts, 'minute')),
    Number(part(parts, 'second')),
  )
  const totalMinutes = Math.round((representedAsUtc - reference.getTime()) / 60_000)
  const sign = totalMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(totalMinutes)
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

export function localDateTimeToIso(value: string, timezone: string): string {
  const dateValue = value.slice(0, 10)
  return new Date(`${value}:00${timeZoneOffset(timezone, dateValue)}`).toISOString()
}

