import { API_BASE_URL } from '../config/env'

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_EMAIL_KEY = 'auth_email'

async function parseJson(response) {
  return response.json().catch(() => ({}))
}

export async function apiRequest(path, options = {}) {
  const { token = '', headers = {}, body, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_EMAIL_KEY)

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    throw new Error(data.message ?? 'Request failed.')
  }

  return data
}
