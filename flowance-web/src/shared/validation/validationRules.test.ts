// @vitest-environment jsdom

import {describe, expect, it} from 'vitest'
import {VALIDATION_CODE} from '@/shared/errors/errorCodes'
import {validateControl, validateImageFile, validateRange} from './validationRules'

function formWithInput(name: string, value: string, type = 'text'): HTMLInputElement {
  const form = document.createElement('form')
  const input = document.createElement('input')
  input.name = name
  input.type = type
  input.value = value
  form.append(input)
  document.body.append(form)
  return input
}

describe('validateControl', () => {
  it('matches backend client validation by rejecting hyphenated phone numbers', () => {
    const input = formWithInput('phone', '090-1234-5678', 'tel')

    expect(validateControl(input)?.code).toBe(VALIDATION_CODE.PHONE_INVALID_FORMAT)
  })

  it('matches backend settings validation by accepting up to fifteen digits', () => {
    const input = formWithInput('phoneNumber', '123456789012345', 'tel')

    expect(validateControl(input)).toBeNull()
  })

  it('matches backend settings validation by rejecting symbols in phoneNumber', () => {
    const input = formWithInput('phoneNumber', '090-1234-5678', 'tel')

    expect(validateControl(input)?.code).toBe(
      VALIDATION_CODE.SETTINGS_PHONE_INVALID_FORMAT,
    )
  })

  it('matches backend client validation by requiring seven postal code digits', () => {
    const input = formWithInput('postalCode', '123456a')
    input.dataset.maxLength = '7'

    expect(validateControl(input)?.code).toBe(
      VALIDATION_CODE.POSTAL_CODE_INVALID_FORMAT,
    )
  })
})

describe('validateRange', () => {
  it('rejects project endDate values before startDate', () => {
    const form = document.createElement('form')
    const start = document.createElement('input')
    const end = document.createElement('input')
    start.name = 'startDate'
    start.value = '2026-07-31'
    end.name = 'endDate'
    end.value = '2026-07-30'
    form.append(start, end)
    document.body.append(form)

    expect(validateRange(end)?.code).toBe(VALIDATION_CODE.INVALID_DATE_RANGE)
  })

  it('rejects work schedule end times that do not follow the start time', () => {
    const form = document.createElement('form')
    const start = document.createElement('input')
    const end = document.createElement('input')
    start.name = 'scheduledStartAt'
    start.value = '2026-07-30T10:00'
    end.name = 'scheduledEndAt'
    end.value = '2026-07-30T09:00'
    form.append(start, end)
    document.body.append(form)

    expect(validateRange(end)?.code).toBe(VALIDATION_CODE.INVALID_TIME_RANGE)
  })
})

describe('validateImageFile', () => {
  it('rejects SVG files before upload', () => {
    const file = new File(['<svg></svg>'], 'icon.svg', {type: 'image/svg+xml'})

    expect(validateImageFile(file)?.code).toBe(VALIDATION_CODE.UNSUPPORTED_FILE_TYPE)
  })

  it('rejects files larger than five megabytes', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    })

    expect(validateImageFile(file)?.code).toBe(VALIDATION_CODE.FILE_TOO_LARGE)
  })
})
