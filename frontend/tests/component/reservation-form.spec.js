import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReservationForm from '../../src/features/reservations/ui/ReservationForm.vue'

describe('ReservationForm', () => {
  it('disables submit when no equipment is available', () => {
    const wrapper = mount(ReservationForm, {
      props: {
        equipment: [],
        loadingEquipment: false,
        loadingSubmit: false,
      },
    })

    expect(wrapper.get('[data-testid="reservation-submit"]').attributes('disabled')).toBeDefined()
  })

  it('emits payload with selected equipment id as number', async () => {
    const wrapper = mount(ReservationForm, {
      props: {
        equipment: [{ id: 42, name: 'Dell Latitude 7440', reference: 'EQ-LAP-001' }],
        loadingEquipment: false,
        loadingSubmit: false,
      },
    })

    await wrapper.get('[data-testid="reservation-start-date"]').setValue('2026-03-20T09:00')
    await wrapper.get('[data-testid="reservation-end-date"]').setValue('2026-03-20T18:00')
    await wrapper.get('[data-testid="reservation-form"]').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')[0][0]).toEqual({
      equipmentId: 42,
      startDate: '2026-03-20T09:00',
      endDate: '2026-03-20T18:00',
    })
  })
})
