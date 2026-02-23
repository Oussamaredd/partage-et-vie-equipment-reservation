import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../src/shared/api/httpClient'
import { login, requestPasswordReset, resetPasswordByEmail, signup } from '../../src/features/auth/api/authApi'
import { fetchEquipment } from '../../src/features/equipment/api/equipmentApi'
import { createReservation, deleteReservation, listReservations } from '../../src/features/reservations/api/reservationApi'

describe('HTTP client and API wrappers', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends JSON body and bearer token when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/reservations', {
      method: 'POST',
      token: 'jwt-token',
      headers: { 'Content-Type': 'application/json' },
      body: { equipmentId: 1 },
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
      body: JSON.stringify({ equipmentId: 1 }),
    })
  })

  it('clears auth storage on authenticated 401 response', async () => {
    localStorage.setItem('auth_token', 'jwt-token')
    localStorage.setItem('auth_email', 'employee@company.test')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', '/login')

    await expect(apiRequest('/api/reservations', { token: 'jwt-token' })).rejects.toThrow('Unauthorized')

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('auth_email')).toBeNull()
  })

  it('maps auth API calls to expected endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await signup({ email: 'a@b.c', password: 'Password123' })
    await login({ email: 'a@b.c', password: 'Password123' })
    await requestPasswordReset({ email: 'a@b.c' })
    await resetPasswordByEmail({ email: 'a@b.c', newPassword: 'NewPassword123' })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/signup',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/auth/forgot-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/auth/forgot-password',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('maps reservation and equipment API calls to expected endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchEquipment()
    await createReservation({ equipmentId: 1 }, 'jwt-token')
    await listReservations('jwt-token')
    await deleteReservation(55, 'jwt-token')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/equipment', expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/reservations',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/reservations', expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/reservations/55',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
