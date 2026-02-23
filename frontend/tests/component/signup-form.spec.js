import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SignupForm from '../../src/features/auth/ui/SignupForm.vue'

describe('SignupForm', () => {
  it('emits credentials on submit', async () => {
    const wrapper = mount(SignupForm)

    await wrapper.get('[data-testid="signup-email"]').setValue('new.user@company.test')
    await wrapper.get('[data-testid="signup-password"]').setValue('Password123')
    await wrapper.get('[data-testid="signup-form"]').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toEqual([
      [{ email: 'new.user@company.test', password: 'Password123' }],
    ])
  })

  it('disables submit while loading', () => {
    const wrapper = mount(SignupForm, {
      props: {
        loading: true,
      },
    })

    expect(wrapper.get('[data-testid="signup-submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Creating account...')
  })
})
