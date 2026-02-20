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
  return state.token !== ''
}

export function useAuthStore() {
  return state
}
