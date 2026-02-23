import { beforeEach, describe, expect, it } from 'vitest'
import { clearAuth, isAuthenticated, setAuth, useAuthStore } from '../../src/features/auth/model/authStore'

function createToken(payload) {
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `header.${encodedPayload}.signature`
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuth()
  })

  it('returns false and clears auth for expired token', () => {
    const expiredToken = createToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    setAuth(expiredToken, 'employee@company.test')

    expect(isAuthenticated()).toBe(false)

    const state = useAuthStore()
    expect(state.token).toBe('')
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('returns false and clears auth for invalid payload JSON', () => {
    setAuth('header.invalid-json.signature', 'employee@company.test')

    expect(isAuthenticated()).toBe(false)

    const state = useAuthStore()
    expect(state.token).toBe('')
    expect(state.email).toBe('')
  })

  it('returns true for valid non-expired token', () => {
    const validToken = createToken({ exp: Math.floor(Date.now() / 1000) + 3600 })
    setAuth(validToken, 'employee@company.test')

    expect(isAuthenticated()).toBe(true)
  })
})
