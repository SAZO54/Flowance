export type WorkRecordMonthRange = {
  from?: string
  to?: string
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

/**
 * Converts an HTML month value into the half-open API range [from, to).
 * Phase1 uses the same Asia/Tokyo offset as the schedule and work-record UI.
 */
export function workRecordMonthRange(value: string): WorkRecordMonthRange {
  const match = MONTH_PATTERN.exec(value)
  if (!match) return {}

  const year = Number(match[1])
  const month = Number(match[2])
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1

  return {
    from: `${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`,
    to: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`,
  }
}
