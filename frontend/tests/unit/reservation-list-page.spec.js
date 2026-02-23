import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const authState = { token: 'jwt-token' }
const reservationItems = ref([])
const reservationLoading = ref(false)
const reservationError = ref('')
const deletingId = ref(null)
const actionMessage = ref('')
const actionError = ref('')
const loadReservations = vi.fn(async () => {})
const removeReservation = vi.fn(async () => {})

vi.mock('../../src/features/auth/model/useAuthSession', () => ({
  useAuthSession: () => ({
    state: authState,
  }),
}))

vi.mock('../../src/features/reservations/model/useReservationList', () => ({
  useReservationList: () => ({
    items: reservationItems,
    loading: reservationLoading,
    error: reservationError,
    deletingId,
    actionMessage,
    actionError,
    load: loadReservations,
    remove: removeReservation,
  }),
}))

import ReservationListPage from '../../src/features/reservations/pages/ReservationListPage.vue'

describe('ReservationListPage', () => {
  beforeEach(() => {
    reservationItems.value = []
    reservationLoading.value = false
    reservationError.value = ''
    deletingId.value = null
    actionMessage.value = ''
    actionError.value = ''
    loadReservations.mockReset()
    removeReservation.mockReset()
  })

  it('loads current user reservations on mount', async () => {
    mount(ReservationListPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          ReservationList: true,
        },
      },
    })

    await flushPromises()

    expect(loadReservations).toHaveBeenCalledWith('jwt-token')
  })

  it('deletes first reservation from panel action when available', async () => {
    reservationItems.value = [{ id: 77, equipment: { name: 'Laptop' } }]

    const wrapper = mount(ReservationListPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          ReservationList: true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="reservation-delete-top-right"]').trigger('click')

    expect(removeReservation).toHaveBeenCalledWith(77, 'jwt-token')
  })

  it('renders action feedback message when deletion succeeded', async () => {
    actionMessage.value = 'Reservation deleted successfully.'

    const wrapper = mount(ReservationListPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          ReservationList: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="reservation-delete-feedback"]').text()).toContain('Reservation deleted successfully.')
  })
})
