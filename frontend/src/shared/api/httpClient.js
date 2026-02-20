import { API_BASE_URL } from '../config/env'

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
    throw new Error(data.message ?? 'Request failed.')
  }

  return data
}
