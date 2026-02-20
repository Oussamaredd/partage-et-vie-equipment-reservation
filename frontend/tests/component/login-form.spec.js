import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LoginForm from '../../src/features/auth/ui/LoginForm.vue'

describe('LoginForm', () => {
  it('emits credentials on submit', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.get('[data-testid="login-email"]').setValue('employee@company.test')
    await wrapper.get('[data-testid="login-password"]').setValue('ChangeMe123')
    await wrapper.get('[data-testid="login-form"]').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toEqual([
      [{ email: 'employee@company.test', password: 'ChangeMe123' }],
    ])
  })
})
