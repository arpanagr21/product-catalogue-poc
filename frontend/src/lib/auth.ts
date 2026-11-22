import { createContext, use } from 'react'
import type { User } from '@/types/catalogue'

export type Auth = {
  /** `undefined` while we're still asking the API, `null` for guests. */
  user: User | null | undefined
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

/** The signed-in admin and the login/logout actions, provided by `AuthProvider`. */
export function useAuth(): Auth {
  const auth = use(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.')
  return auth
}
