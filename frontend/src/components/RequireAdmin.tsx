import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/queries'

/** Route guard for admin pages. The API enforces auth regardless; this is just UX. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <Skeleton className="h-64" />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />

  return <>{children}</>
}
