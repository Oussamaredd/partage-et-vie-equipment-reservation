import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ForgotPasswordRequestForm from '../../src/features/auth/ui/ForgotPasswordRequestForm.vue'

describe('ForgotPasswordRequestForm', () => {
  it('emits reset payload on submit', async () => {
    const wrapper = mount(ForgotPasswordRequestForm)

    await wrapper.get('[data-testid="forgot-email"]').setValue('employee@company.test')
    await wrapper.get('[data-testid="forgot-new-password"]').setValue('NewPassword123')
    await wrapper.get('[data-testid="forgot-request-form"]').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toEqual([
      [{ email: 'employee@company.test', newPassword: 'NewPassword123' }],
    ])
  })
})
