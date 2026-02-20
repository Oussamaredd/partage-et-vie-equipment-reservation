<script setup>
import { onMounted } from 'vue'
import { useAuthSession } from '../../auth/model/useAuthSession'
import { useEquipmentList } from '../../equipment/model/useEquipmentList'
import { useReservationForm } from '../model/useReservationForm'
import ReservationForm from '../ui/ReservationForm.vue'
import FeedbackMessage from '../../../shared/ui/FeedbackMessage.vue'

const auth = useAuthSession()
const equipment = useEquipmentList()
const reservationForm = useReservationForm()

onMounted(async () => {
  await equipment.load()
  if (equipment.error.value) {
    reservationForm.feedback.value = { type: 'error', message: equipment.error.value }
  }
})

async function onSubmit(payload) {
  await reservationForm.submit(payload, auth.state.token)
}
</script>

<template>
  <section class="panel panel-wide">
    <header class="panel-head">
      <p class="panel-eyebrow">Booking</p>
      <h1>New Reservation</h1>
      <p class="panel-subtitle">Select equipment and reserve a precise time window.</p>
    </header>

    <ReservationForm
      :equipment="equipment.items.value"
      :loading-equipment="equipment.loading.value"
      :loading-submit="reservationForm.loading.value"
      @submit="onSubmit"
    />

    <FeedbackMessage
      testid="reservation-feedback"
      :type="reservationForm.feedback.value.type"
      :message="reservationForm.feedback.value.message"
    />
    <p class="inline-links"><RouterLink to="/reservations">View my reservations</RouterLink></p>
  </section>
</template>
