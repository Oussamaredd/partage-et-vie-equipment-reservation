import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import LoginPage from '../../src/features/auth/pages/LoginPage.vue'
import { useAuthSession } from '../../src/features/auth/model/useAuthSession'
import { createAppRouter } from '../../src/app/router'

describe('Authentication routing and state', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('redirects protected route to login when unauthenticated', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/reservations/new')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('logs in and persists token', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'jwt-token', email: 'employee@company.test' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="login-email"]').setValue('employee@company.test')
    await wrapper.get('[data-testid="login-password"]').setValue('ChangeMe123')
    await wrapper.get('[data-testid="login-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(localStorage.getItem('auth_token')).toBe('jwt-token')
    expect(router.currentRoute.value.path).toBe('/reservations/new')
  })

  it('clears token on logout helper', () => {
    const auth = useAuthSession()
    auth.setAuth('jwt-token', 'employee@company.test')

    auth.clearAuth()

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(auth.state.token).toBe('')
  })
})
