import { apiClient, ApiError, type ApiEnvelope } from '@/lib/api/client'
import type { User } from '@/types/catalogue'

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<User> {
    return (await apiClient.post<ApiEnvelope<User>>('/login', credentials)).data
  },

  async logout(): Promise<void> {
    await apiClient.post('/logout')
  },

  /** The signed-in admin, or null for guests. */
  async currentUser(): Promise<User | null> {
    try {
      return (await apiClient.get<ApiEnvelope<User>>('/user')).data
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthenticated) return null
      throw error
    }
  },
}
