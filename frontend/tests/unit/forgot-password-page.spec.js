import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from '../../src/features/auth/pages/ForgotPasswordPage.vue'

vi.mock('../../src/features/auth/api/authApi', () => ({
  resetPasswordByEmail: vi.fn(),
}))

import { resetPasswordByEmail } from '../../src/features/auth/api/authApi'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows success feedback when reset request succeeds', async () => {
    resetPasswordByEmail.mockResolvedValue({ message: 'Password reset successfully.' })

    const wrapper = mount(ForgotPasswordPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await wrapper.get('[data-testid="forgot-email"]').setValue('employee@company.test')
    await wrapper.get('[data-testid="forgot-new-password"]').setValue('NewPassword123')
    await wrapper.get('[data-testid="forgot-request-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(resetPasswordByEmail).toHaveBeenCalledWith({
      email: 'employee@company.test',
      newPassword: 'NewPassword123',
    })
    expect(wrapper.get('[data-testid="forgot-feedback"]').text()).toContain('Password reset successfully.')
  })

  it('shows error feedback when reset request fails', async () => {
    resetPasswordByEmail.mockRejectedValue(new Error('User not found.'))

    const wrapper = mount(ForgotPasswordPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await wrapper.get('[data-testid="forgot-email"]').setValue('unknown@company.test')
    await wrapper.get('[data-testid="forgot-new-password"]').setValue('NewPassword123')
    await wrapper.get('[data-testid="forgot-request-form"]').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="forgot-feedback"]').text()).toContain('User not found.')
  })
})
