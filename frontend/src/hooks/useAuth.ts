import { create } from 'zustand'
import api, { getStoredToken, setStoredToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const res = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setStoredToken(res.data.access_token)
      set({ user: res.data.user, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    setStoredToken(null)
    set({ user: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    // Only try if we have a stored token
    if (!getStoredToken()) {
      set({ isLoading: false })
      return
    }
    set({ isLoading: true })
    try {
      const res = await api.get('/auth/me')
      set({ user: res.data, isLoading: false })
    } catch {
      setStoredToken(null)
      set({ user: null, isLoading: false })
    }
  },
}))

export function useAuth() {
  return useAuthStore()
}
