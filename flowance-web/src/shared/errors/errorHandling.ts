import {errorMessage} from './errorMessages'

export const FORM_API_ERROR_EVENT = 'flowance:form-api-error'

export type ApiErrorDetail = {
  field?: string
  code: string
  message: string
  submittedVersion?: number
  currentVersion?: number
  limit?: number
  allowedValues?: unknown[]
  resource?: string
}

export type ApiErrorPayload = {
  code?: string
  message?: string
  details?: unknown
  traceId?: string
}

export type FormApiErrorEventDetail = {
  code: string
  message: string
  details: ApiErrorDetail[]
  traceId?: string
}

export function apiErrorDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return []
  return value.filter((detail): detail is ApiErrorDetail => {
    if (!detail || typeof detail !== 'object') return false
    const candidate = detail as Record<string, unknown>
    return typeof candidate.code === 'string' && typeof candidate.message === 'string'
  })
}

export function notifyFormApiError(payload: FormApiErrorEventDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<FormApiErrorEventDetail>(FORM_API_ERROR_EVENT, {detail: payload}),
  )
}

export function normalizedApiMessage(payload: ApiErrorPayload, status: number): string {
  return errorMessage(payload.code ?? `HTTP_${status}`, payload.message)
}