import {describe, expect, it} from 'vitest'
import {getCalendarRange} from './calendarRange'

describe('getCalendarRange', () => {
  it('creates a Monday-start week range as a half-open UTC interval', () => {
    expect(
      getCalendarRange({
        anchorDate: '2026-07-22',
        period: 'week',
        utcOffset: '+09:00',
      }),
    ).toEqual({
      from: '2026-07-19T15:00:00.000Z',
      to: '2026-07-26T15:00:00.000Z',
    })
  })

  it('supports Sunday-start weeks', () => {
    expect(
      getCalendarRange({
        anchorDate: '2026-07-22',
        period: 'week',
        utcOffset: '+09:00',
        weekStartsOn: 'SUNDAY',
      }),
    ).toEqual({
      from: '2026-07-18T15:00:00.000Z',
      to: '2026-07-25T15:00:00.000Z',
    })
  })

  it('creates a month range as a half-open UTC interval', () => {
    expect(
      getCalendarRange({
        anchorDate: '2026-07-22',
        period: 'month',
        utcOffset: '+09:00',
      }),
    ).toEqual({
      from: '2026-06-30T15:00:00.000Z',
      to: '2026-07-31T15:00:00.000Z',
    })
  })

  it('rejects invalid dates and offsets', () => {
    expect(() =>
      getCalendarRange({anchorDate: '2026-02-30', period: 'week'}),
    ).toThrow('anchorDate must be a valid calendar date.')
    expect(() =>
      getCalendarRange({
        anchorDate: '2026-07-22',
        period: 'week',
        utcOffset: '09:00',
      }),
    ).toThrow('utcOffset must use +HH:MM or -HH:MM format.')
  })
})
