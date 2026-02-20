<script setup>
import { onMounted } from 'vue'
import { useAuthSession } from '../../auth/model/useAuthSession'
import { useReservationList } from '../model/useReservationList'
import ReservationList from '../ui/ReservationList.vue'

const auth = useAuthSession()
const reservations = useReservationList()

onMounted(async () => {
  await reservations.load(auth.state.token)
})
</script>

<template>
  <section class="panel panel-wide">
    <header class="panel-head">
      <p class="panel-eyebrow">Tracking</p>
      <h1>My Reservations</h1>
      <p class="panel-subtitle">Review your upcoming and active bookings.</p>
    </header>

    <ReservationList
      :reservations="reservations.items.value"
      :loading="reservations.loading.value"
      :error="reservations.error.value"
    />
    <p class="inline-links"><RouterLink to="/reservations/new">Back to reservation form</RouterLink></p>
  </section>
</template>
