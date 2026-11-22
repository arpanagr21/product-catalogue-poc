import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'

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
