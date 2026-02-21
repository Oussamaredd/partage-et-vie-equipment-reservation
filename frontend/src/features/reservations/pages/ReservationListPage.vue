<script setup>
import { computed, onMounted } from 'vue'
import { useAuthSession } from '../../auth/model/useAuthSession'
import { useReservationList } from '../model/useReservationList'
import ReservationList from '../ui/ReservationList.vue'

const auth = useAuthSession()
const reservations = useReservationList()

onMounted(async () => {
  await reservations.load(auth.state.token)
})

const hasReservations = computed(() => reservations.items.value.length > 0)

async function onDeleteReservation(reservationId) {
  await reservations.remove(reservationId, auth.state.token)
}

async function onPanelDelete() {
  if (!hasReservations.value || reservations.deletingId.value !== null) {
    return
  }

  await onDeleteReservation(reservations.items.value[0].id)
}
</script>

<template>
  <section class="panel panel-wide">
    <header class="panel-head">
      <div class="panel-head-row">
        <div class="panel-head-content">
          <p class="panel-eyebrow">Tracking</p>
          <h1>My Reservations</h1>
          <p class="panel-subtitle">Review your upcoming and active bookings.</p>
        </div>
        <button
          class="reservation-delete-top-right"
          data-testid="reservation-delete-top-right"
          type="button"
          :disabled="reservations.loading.value || reservations.deletingId.value !== null || !hasReservations"
          :title="hasReservations ? 'Delete the latest reservation and refresh the list.' : 'No reservation available to delete.'"
          aria-label="Refresh reservations"
          @click="onPanelDelete"
        >
          {{ reservations.deletingId.value !== null ? 'Deleting...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <ReservationList
      :reservations="reservations.items.value"
      :loading="reservations.loading.value"
      :error="reservations.error.value"
    />
    <p v-if="reservations.actionMessage.value" class="ok" data-testid="reservation-delete-feedback">
      {{ reservations.actionMessage.value }}
    </p>
    <p v-else-if="reservations.actionError.value" class="error" data-testid="reservation-delete-feedback">
      {{ reservations.actionError.value }}
    </p>
    <p class="inline-links"><RouterLink to="/reservations/new">Back to reservation form</RouterLink></p>
  </section>
</template>
