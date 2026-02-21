import { reactive } from 'vue'
import { readStorage, removeStorage, writeStorage } from '../../../shared/lib/storage'

const TOKEN_KEY = 'auth_token'
const EMAIL_KEY = 'auth_email'

const state = reactive({
  token: readStorage(TOKEN_KEY),
  email: readStorage(EMAIL_KEY),
})

export function setAuth(token, email) {
  state.token = token
  state.email = email
  writeStorage(TOKEN_KEY, token)
  writeStorage(EMAIL_KEY, email)
}

export function clearAuth() {
  state.token = ''
  state.email = ''
  removeStorage(TOKEN_KEY)
  removeStorage(EMAIL_KEY)
}

export function isAuthenticated() {
  if (state.token === '') {
    return false
  }

  const payload = decodeJwtPayload(state.token)
  if (!payload) {
    clearAuth()
    return false
  }

  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    clearAuth()
    return false
  }

  return true
}

export function useAuthStore() {
  return state
}

function decodeJwtPayload(token) {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) {
    return null
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padding = (4 - (base64.length % 4)) % 4
    const normalized = `${base64}${'='.repeat(padding)}`
    const json = atob(normalized)

    return JSON.parse(json)
  } catch {
    return null
  }
}
