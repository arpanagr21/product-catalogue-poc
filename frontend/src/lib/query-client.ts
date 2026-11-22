import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

/** Retry only what might succeed on retry: network errors and 5xx, never 4xx. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: shouldRetry, refetchOnWindowFocus: false },
    },
  })
}
