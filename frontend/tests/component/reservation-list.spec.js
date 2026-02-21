import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReservationList from '../../src/features/reservations/ui/ReservationList.vue'

describe('ReservationList', () => {
  it('renders reservation rows', () => {
    const wrapper = mount(ReservationList, {
      props: {
        reservations: [
          {
            id: 12,
            startDate: '2026-03-20T09:00:00+00:00',
            endDate: '2026-03-20T18:00:00+00:00',
            equipment: { id: 1, name: 'Dell Latitude 7440', reference: 'EQ-LAP-001' },
          },
        ],
        loading: false,
        error: '',
      },
    })

    expect(wrapper.text()).toContain('Dell Latitude 7440')
    expect(wrapper.text()).toContain('2026-03-20T09:00:00+00:00 - 2026-03-20T18:00:00+00:00')
  })

  it('shows empty state when list is empty', () => {
    const wrapper = mount(ReservationList, {
      props: {
        reservations: [],
        loading: false,
        error: '',
      },
    })

    expect(wrapper.text()).toContain('No reservations found. Create one to get started.')
  })
})
