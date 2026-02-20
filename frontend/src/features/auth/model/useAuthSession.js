import { clearAuth, isAuthenticated, setAuth, useAuthStore } from './authStore'

export function useAuthSession() {
  const state = useAuthStore()

  return {
    state,
    setAuth,
    clearAuth,
    isAuthenticated,
  }
}
