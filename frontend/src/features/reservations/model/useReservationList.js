import { ref } from 'vue'
import { listReservations } from '../api/reservationApi'

export function useReservationList() {
  const items = ref([])
  const loading = ref(true)
  const error = ref('')

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

  return {
    items,
    loading,
    error,
    load,
  }
}
