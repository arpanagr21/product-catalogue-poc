import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/lib/api/client'

/**
 * Show a failed submission on the form: Laravel 422 field errors go on their
 * fields; anything else becomes a form-level error under `root`.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]) {
  if (error instanceof ApiError && error.isValidation) {
    let matched = false
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      if ((fields as readonly string[]).includes(field)) {
        setError(field as Path<T>, { message: messages[0] })
        matched = true
      }
    }
    if (matched) return
  }

  setError('root' as Path<T>, {
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  })
}
