import { config } from '@/lib/config'

/**
 * Base API client. Every request to the backend goes through here; services
 * build on top of it and never call fetch directly.
 *
 * Handles: base URL, JSON, cookies (Sanctum SPA auth), CSRF, and a typed error.
 */

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  get isNotFound() {
    return this.status === 404
  }

  get isUnauthenticated() {
    return this.status === 401
  }

  get isValidation() {
    return this.status === 422
  }
}

/** Envelope used by every JSON response that returns a resource. */
export type ApiEnvelope<T> = { data: T }

type Query = Record<string, string | number | undefined>

type RequestOptions = {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

const XSRF_COOKIE = 'XSRF-TOKEN'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

/** Ask Laravel to set the XSRF-TOKEN cookie (Sanctum SPA flow). */
async function fetchCsrfCookie(): Promise<void> {
  await fetch(new URL('/sanctum/csrf-cookie', config.apiUrl), { credentials: 'include' })
}

function buildUrl(path: string, query?: Query): URL {
  const url = new URL(`/api${path}`, config.apiUrl)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}))
  return new ApiError(
    response.status,
    body.message || response.statusText || 'Something went wrong.',
    body.errors ?? {},
  )
}

async function request<T>(method: string, path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const unsafe = UNSAFE_METHODS.has(method)
  if (unsafe && !readCookie(XSRF_COOKIE)) await fetchCsrfCookie()

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const xsrf = readCookie(XSRF_COOKIE)
  if (unsafe && xsrf) headers['X-XSRF-TOKEN'] = xsrf

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach the server. Check your connection and try again.')
  }

  // 419 = CSRF token missing/expired (e.g. session rotated). Refresh it and retry once.
  if (response.status === 419 && !isRetry) {
    await fetchCsrfCookie()
    return request<T>(method, path, options, true)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
