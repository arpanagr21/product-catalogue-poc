import { useId, type ComponentProps } from 'react'
import type { FieldError as FormError } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  label: string
  error?: FormError
  multiline?: boolean
} & ComponentProps<'input'> &
  Pick<ComponentProps<'textarea'>, 'rows'>

/** Label + control + error, wired for accessibility. Spread `form.register(name)` into it. */
export function FormField({ label, error, multiline, ...controlProps }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const aria = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea {...(controlProps as ComponentProps<'textarea'>)} {...aria} />
      ) : (
        <Input {...controlProps} {...aria} />
      )}
      <FieldError id={errorId} errors={[error]} />
    </Field>
  )
}
