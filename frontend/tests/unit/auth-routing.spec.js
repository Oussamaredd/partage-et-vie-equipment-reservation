import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import LoginPage from '../../src/features/auth/pages/LoginPage.vue'
import { useAuthSession } from '../../src/features/auth/model/useAuthSession'
import { createAppRouter } from '../../src/app/router'

describe('Authentication routing and state', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthSession().clearAuth()
    vi.restoreAllMocks()
  })

  it('redirects root to login when unauthenticated', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('keeps root on login even when authenticated', async () => {
    const auth = useAuthSession()
    auth.setAuth('header.eyJleHAiOjQxMDAwMDAwMDB9.signature', 'employee@company.test')

    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('renders not found route for unknown path', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/this-page-does-not-exist')
    await router.isReady()

    expect(router.currentRoute.value.matched.at(-1)?.path).toBe('/:pathMatch(.*)*')
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
      json: async () => ({ token: 'header.eyJleHAiOjQxMDAwMDAwMDB9.signature', email: 'employee@company.test' }),
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
    expect(localStorage.getItem('auth_token')).toBe('header.eyJleHAiOjQxMDAwMDAwMDB9.signature')
    expect(router.currentRoute.value.path).toBe('/reservations/new')
  })

  it('clears token on logout helper', () => {
    const auth = useAuthSession()
    auth.setAuth('jwt-token', 'employee@company.test')

    auth.clearAuth()

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(auth.state.token).toBe('')
  })

  it('redirects protected route to login and clears malformed token', async () => {
    const auth = useAuthSession()
    auth.setAuth('malformed-token', 'employee@company.test')

    const router = createAppRouter(createMemoryHistory())
    await router.push('/reservations/new')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(auth.state.token).toBe('')
    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})
