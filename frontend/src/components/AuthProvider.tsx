import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type Auth } from '@/lib/auth'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/catalogue'

/** Asks the API who is signed in once, and keeps that in sync with login and logout. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    authService.currentUser().then(setUser, () => setUser(null))
  }, [])

  const auth: Auth = {
    user,
    login: async (credentials) => setUser(await authService.login(credentials)),
    // Even if the request fails, treat the admin as signed out here.
    logout: () => authService.logout().then(
      () => setUser(null),
      () => setUser(null),
    ),
  }

  return <AuthContext value={auth}>{children}</AuthContext>
}
