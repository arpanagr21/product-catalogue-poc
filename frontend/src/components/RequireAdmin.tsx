import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'

/** Route guard for admin pages. The API enforces auth regardless; this is just UX. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) return <Skeleton className="h-64" />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />

  return <>{children}</>
}
