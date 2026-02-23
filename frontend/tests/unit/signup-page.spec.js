import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../../src/app/router'
import SignupPage from '../../src/features/auth/pages/SignupPage.vue'

vi.mock('../../src/features/auth/api/authApi', () => ({
  signup: vi.fn(),
}))

import { signup } from '../../src/features/auth/api/authApi'

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits signup payload and redirects to login on success', async () => {
    signup.mockResolvedValue({ message: 'Account created.' })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/signup')
    await router.isReady()

    const wrapper = mount(SignupPage, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="signup-email"]').setValue('new.user@company.test')
    await wrapper.get('[data-testid="signup-password"]').setValue('Password123')
    await wrapper.get('[data-testid="signup-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(signup).toHaveBeenCalledWith({
      email: 'new.user@company.test',
      password: 'Password123',
    })
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('shows backend error and keeps user on signup page when request fails', async () => {
    signup.mockRejectedValue(new Error('Email already exists.'))

    const router = createAppRouter(createMemoryHistory())
    await router.push('/signup')
    await router.isReady()

    const wrapper = mount(SignupPage, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="signup-email"]').setValue('existing.user@company.test')
    await wrapper.get('[data-testid="signup-password"]').setValue('Password123')
    await wrapper.get('[data-testid="signup-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="signup-feedback"]').text()).toContain('Email already exists.')
    expect(router.currentRoute.value.path).toBe('/signup')
  })
})
