import { apiRequest } from '../../../shared/api/httpClient'

export function createReservation(payload, token) {
  return apiRequest('/api/reservations', {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })
}

export function listReservations(token) {
  return apiRequest('/api/reservations', {
    token,
  })
}
