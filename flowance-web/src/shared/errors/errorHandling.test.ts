// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest'
import {ERROR_CODE} from './errorCodes'
import {
  FORM_API_ERROR_EVENT,
  apiErrorDetails,
  normalizedApiMessage,
  notifyFormApiError,
} from './errorHandling'

describe('apiErrorDetails', () => {
  it('keeps only details with a code and message', () => {
    expect(
      apiErrorDetails([
        {field: 'name', code: 'REQUIRED', message: '必須項目です。'},
        {code: 'BROKEN'},
        null,
      ]),
    ).toEqual([{field: 'name', code: 'REQUIRED', message: '必須項目です。'}])
  })
})

describe('normalizedApiMessage', () => {
  it('prefers known frontend messages for known API error codes', () => {
    expect(normalizedApiMessage({code: ERROR_CODE.FORBIDDEN}, 403)).toBe(
      'この操作を実行する権限がありません。',
    )
  })

  it('uses the API message as a fallback for unknown codes', () => {
    expect(
      normalizedApiMessage({code: 'UNKNOWN_CODE', message: 'backend message'}, 500),
    ).toBe('backend message')
  })
})

describe('notifyFormApiError', () => {
  it('dispatches a browser event with the normalized payload', () => {
    const listener = vi.fn()
    window.addEventListener(FORM_API_ERROR_EVENT, listener)

    notifyFormApiError({
      code: ERROR_CODE.VALIDATION_ERROR,
      message: '入力内容を確認してください。',
      details: [{code: 'REQUIRED', message: '必須項目です。', field: 'name'}],
      traceId: 'trace-1',
    })

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail.traceId).toBe('trace-1')
    window.removeEventListener(FORM_API_ERROR_EVENT, listener)
  })
})
