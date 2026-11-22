import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'

type Props<T> = {
  query: UseQueryResult<T>
  /** Shown while loading; usually a skeleton shaped like the content. */
  loading: ReactNode
  children: (data: T) => ReactNode
}

/** One place for the loading, error and success states of every data-driven view. */
export function QueryState<T>({ query, loading, children }: Props<T>) {
  if (query.isPending) return <>{loading}</>
  if (query.isError) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
  return <>{children(query.data)}</>
}

export function ErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const notFound = error instanceof ApiError && error.isNotFound

  return (
    <Alert variant={notFound ? 'default' : 'destructive'}>
      <AlertCircle />
      <AlertTitle>{notFound ? 'Not found' : 'Something went wrong'}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {onRetry && !notFound && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
