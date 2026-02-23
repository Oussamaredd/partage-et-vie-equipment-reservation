import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NotFoundPage from '../../src/app/pages/NotFoundPage.vue'

describe('NotFoundPage', () => {
  it('renders user-facing not found content', () => {
    const wrapper = mount(NotFoundPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Page not found')
    expect(wrapper.text()).toContain('Go to home')
  })
})
