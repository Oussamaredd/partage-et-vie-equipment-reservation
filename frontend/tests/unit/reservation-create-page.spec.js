import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const authState = { token: 'jwt-token' }
const equipmentItems = ref([])
const equipmentLoading = ref(false)
const equipmentError = ref('')
const loadEquipment = vi.fn(async () => {})
const reservationLoading = ref(false)
const reservationFeedback = ref({ type: '', message: '' })
const submitReservation = vi.fn(async () => {})

vi.mock('../../src/features/auth/model/useAuthSession', () => ({
  useAuthSession: () => ({
    state: authState,
  }),
}))

vi.mock('../../src/features/equipment/model/useEquipmentList', () => ({
  useEquipmentList: () => ({
    items: equipmentItems,
    loading: equipmentLoading,
    error: equipmentError,
    load: loadEquipment,
  }),
}))

vi.mock('../../src/features/reservations/model/useReservationForm', () => ({
  useReservationForm: () => ({
    loading: reservationLoading,
    feedback: reservationFeedback,
    submit: submitReservation,
  }),
}))

import ReservationCreatePage from '../../src/features/reservations/pages/ReservationCreatePage.vue'

describe('ReservationCreatePage', () => {
  beforeEach(() => {
    equipmentItems.value = [{ id: 1, name: 'Laptop', reference: 'EQ-LAP-001' }]
    equipmentLoading.value = false
    equipmentError.value = ''
    reservationLoading.value = false
    reservationFeedback.value = { type: '', message: '' }
    loadEquipment.mockReset()
    submitReservation.mockReset()
  })

  it('loads equipment on mount and submits reservation with auth token', async () => {
    const wrapper = mount(ReservationCreatePage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          ReservationForm: {
            template: `<button data-testid="emit-submit" @click="$emit('submit', { equipmentId: 1, startDate: '2026-03-20T09:00', endDate: '2026-03-20T18:00' })">emit</button>`,
          },
        },
      },
    })

    await flushPromises()
    expect(loadEquipment).toHaveBeenCalledOnce()

    await wrapper.get('[data-testid="emit-submit"]').trigger('click')

    expect(submitReservation).toHaveBeenCalledWith(
      { equipmentId: 1, startDate: '2026-03-20T09:00', endDate: '2026-03-20T18:00' },
      'jwt-token'
    )
  })

  it('propagates equipment loading error as feedback', async () => {
    loadEquipment.mockImplementation(async () => {
      equipmentError.value = 'Unable to load equipment.'
    })

    mount(ReservationCreatePage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          ReservationForm: true,
        },
      },
    })

    await flushPromises()

    expect(reservationFeedback.value).toEqual({
      type: 'error',
      message: 'Unable to load equipment.',
    })
  })
})
