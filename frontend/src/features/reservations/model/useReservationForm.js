import { ref } from 'vue'
import { createReservation } from '../api/reservationApi'

export function useReservationForm() {
  const loading = ref(false)
  const feedback = ref({ type: '', message: '' })

  async function submit(payload, token) {
    loading.value = true
    feedback.value = { type: '', message: '' }

    try {
      const response = await createReservation(payload, token)
      feedback.value = { type: 'ok', message: response.message }
    } catch (e) {
      feedback.value = { type: 'error', message: e instanceof Error ? e.message : 'Reservation failed.' }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    feedback,
    submit,
  }
}
