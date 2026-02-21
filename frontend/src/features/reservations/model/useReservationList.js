import { ref } from 'vue'
import { deleteReservation, listReservations } from '../api/reservationApi'

export function useReservationList() {
  const items = ref([])
  const loading = ref(true)
  const error = ref('')
  const deletingId = ref(null)
  const actionError = ref('')
  const actionMessage = ref('')

  async function load(token) {
    loading.value = true
    error.value = ''

    try {
      items.value = await listReservations(token)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unable to load reservations.'
    } finally {
      loading.value = false
    }
  }

  async function remove(reservationId, token) {
    deletingId.value = reservationId
    actionError.value = ''
    actionMessage.value = ''

    try {
      const response = await deleteReservation(reservationId, token)
      actionMessage.value = response?.message ?? 'Reservation deleted successfully.'
      await load(token)
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Unable to delete reservation.'
    } finally {
      deletingId.value = null
    }
  }

  return {
    items,
    loading,
    error,
    deletingId,
    actionError,
    actionMessage,
    load,
    remove,
  }
}
