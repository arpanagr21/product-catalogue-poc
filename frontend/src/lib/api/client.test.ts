import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { api, server } from '@/test/server'
import { apiClient, ApiError } from './client'

describe('apiClient', () => {
  it('sends JSON requests with cookies to the backend /api prefix', async () => {
    let seen: Request | undefined
    server.use(
      http.get(api('/products'), ({ request }) => {
        seen = request
        return HttpResponse.json({ data: [] })
      }),
    )

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await apiClient.get('/products', { query: { q: 'ssd', empty: '' } })

    expect(seen?.url).toBe(`${config.apiUrl}/api/products?q=ssd`)
    expect(seen?.headers.get('accept')).toBe('application/json')
    // Asserted on the fetch call: MSW's reconstructed Request doesn't keep `credentials`.
    expect(fetchSpy.mock.calls[0][1]?.credentials).toBe('include')
    fetchSpy.mockRestore()
  })

  it('fetches the CSRF cookie before the first unsafe request and sends it as X-XSRF-TOKEN', async () => {
    const calls: string[] = []
    let xsrfHeader: string | null = null
    server.use(
      http.get(`${config.apiUrl}/sanctum/csrf-cookie`, () => {
        calls.push('csrf')
        document.cookie = 'XSRF-TOKEN=abc%3D123' // what Laravel's Set-Cookie would do
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(api('/enquiries'), ({ request }) => {
        calls.push('post')
        xsrfHeader = request.headers.get('x-xsrf-token')
        return HttpResponse.json({ message: 'ok' })
      }),
    )

    await apiClient.post('/enquiries', { a: 1 })

    expect(calls).toEqual(['csrf', 'post'])
    expect(xsrfHeader).toBe('abc=123')
  })

  it('refreshes the CSRF token and retries once on 419', async () => {
    document.cookie = 'XSRF-TOKEN=stale'
    let attempts = 0
    server.use(
      http.post(api('/logout'), () => {
        attempts += 1
        return attempts === 1 ? HttpResponse.json({ message: 'CSRF token mismatch.' }, { status: 419 }) : new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(apiClient.post('/logout')).resolves.toBeUndefined()
    expect(attempts).toBe(2)
  })

  it('throws ApiError carrying Laravel validation errors', async () => {
    server.use(
      http.post(api('/enquiries'), () =>
        HttpResponse.json({ message: 'The email field is required.', errors: { email: ['The email field is required.'] } }, { status: 422 }),
      ),
    )

    const request = apiClient.post('/enquiries', {})

    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      isValidation: true,
      fieldErrors: { email: ['The email field is required.'] },
    })
  })

  it('turns network failures into a friendly ApiError with status 0', async () => {
    server.use(http.get(api('/featured'), () => HttpResponse.error()))

    await expect(apiClient.get('/featured')).rejects.toMatchObject({
      status: 0,
      message: expect.stringMatching(/unable to reach the server/i),
    })
  })
})
