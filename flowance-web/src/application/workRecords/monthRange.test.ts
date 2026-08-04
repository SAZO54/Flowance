import {describe, expect, it} from 'vitest'
import {workRecordMonthRange} from './monthRange'

describe('workRecordMonthRange', () => {
  it('converts a valid month into a half-open Asia/Tokyo API range', () => {
    expect(workRecordMonthRange('2026-07')).toEqual({
      from: '2026-07-01T00:00:00+09:00',
      to: '2026-08-01T00:00:00+09:00',
    })
  })

  it('rolls December over to the next year', () => {
    expect(workRecordMonthRange('2026-12')).toEqual({
      from: '2026-12-01T00:00:00+09:00',
      to: '2027-01-01T00:00:00+09:00',
    })
  })

  it('returns an empty query for malformed month values', () => {
    expect(workRecordMonthRange('2026-13')).toEqual({})
    expect(workRecordMonthRange('2026-7')).toEqual({})
    expect(workRecordMonthRange('')).toEqual({})
  })
})
