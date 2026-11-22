import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { applyServerErrors } from '@/lib/forms'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginForm = z.infer<typeof schema>

/** Only allow same-app paths as a post-login redirect (avoids open redirects). */
function safeRedirect(target: string | null): string {
  return target?.startsWith('/') && !target.startsWith('//') ? target : '/admin/featured'
}

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const form = useForm<LoginForm>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const redirectTo = safeRedirect(params.get('redirect'))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      applyServerErrors(error, form.setError, ['email', 'password'])
    }
  })

  if (user) return <Navigate to={redirectTo} replace />

  const { errors, isSubmitting } = form.formState

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>Admin login</CardTitle>
        <CardDescription>Sign in to choose the featured products.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Email" error={errors.email} {...form.register('email')} type="email" autoComplete="username" />
          <FormField label="Password" error={errors.password} {...form.register('password')} type="password" autoComplete="current-password" />
          {errors.root && (
            <p role="alert" className="text-destructive text-sm">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
