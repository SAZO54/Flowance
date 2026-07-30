import {ERROR_CODE} from '@/shared/errors/errorCodes'
import {errorMessage} from '@/shared/errors/errorMessages'
import {
  apiErrorDetails,
  normalizedApiMessage,
  notifyFormApiError,
  type ApiErrorDetail,
  type ApiErrorPayload,
} from '@/shared/errors/errorHandling'

export type {ApiErrorPayload} from '@/shared/errors/errorHandling'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly traceId: string | undefined

  constructor({
    status,
    code,
    message,
    details,
    traceId,
  }: {
    status: number
    code: string
    message: string
    details?: ApiErrorDetail[]
    traceId?: string
  }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details ?? []
    this.traceId = traceId
  }
}

type ApiRequestOptions = RequestInit & {
  retryAuthentication?: boolean
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return {}

  return response.json().catch(() => ({})) as Promise<ApiErrorPayload>
}

export class ApiClient {
  private readonly baseUrl: string
  private refreshPromise: Promise<void> | undefined

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const {retryAuthentication = true, ...requestInit} = options

    try {
      let response = await fetch(this.url(path), this.withDefaults(requestInit))

      if (response.status === 401 && retryAuthentication) {
        await this.refreshAccessToken()
        response = await fetch(this.url(path), this.withDefaults(requestInit))
      }

      if (!response.ok) throw await this.toApiError(response)
      if (response.status === 204) return undefined as T

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) return undefined as T
      return (await response.json()) as T
    } catch (cause) {
      if (cause instanceof ApiError) throw cause
      throw new ApiError({
        status: 0,
        code: ERROR_CODE.NETWORK_ERROR,
        message: errorMessage(ERROR_CODE.NETWORK_ERROR),
      })
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  }

  private withDefaults(options: RequestInit): RequestInit {
    const method = (options.method ?? 'GET').toUpperCase()
    const headers = new Headers(options.headers)
    const csrfToken = UNSAFE_METHODS.has(method) ? readCookie('csrftoken') : undefined

    if (csrfToken) headers.set('X-CSRFToken', csrfToken)

    return {
      ...options,
      method,
      headers,
      credentials: 'include',
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = undefined
      })
    }
    return this.refreshPromise
  }

  private async performRefresh(): Promise<void> {
    const response = await fetch(
      this.url('/api/v1/auth/token/refresh'),
      this.withDefaults({method: 'POST'}),
    )
    if (!response.ok) throw await this.toApiError(response)
  }

  private async toApiError(response: Response): Promise<ApiError> {
    const payload = await readErrorPayload(response)
    const details = apiErrorDetails(payload.details)
    const error = new ApiError({
      status: response.status,
      code: payload.code ?? `HTTP_${response.status}`,
      message: normalizedApiMessage(payload, response.status),
      details,
      traceId: payload.traceId ?? response.headers.get('X-Trace-Id') ?? undefined,
    })
    notifyFormApiError({
      code: error.code,
      message: error.message,
      details,
      traceId: error.traceId,
    })
    return error
  }
}

export const apiClient = new ApiClient()