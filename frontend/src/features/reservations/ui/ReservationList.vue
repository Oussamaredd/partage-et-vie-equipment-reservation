<script setup>
const props = defineProps({
  reservations: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
</script>

<template>
  <p v-if="props.loading">Loading reservations...</p>
  <p v-else-if="props.error" class="error">{{ props.error }}</p>
  <p v-else-if="props.reservations.length === 0" class="empty-state">No reservations found. Create one to get started.</p>
  <ul v-else class="reservation-list">
    <li v-for="item in props.reservations" :key="item.id">
      <strong>{{ item.equipment.name }}</strong>
      <span>{{ item.startDate }} - {{ item.endDate }}</span>
    </li>
  </ul>
</template>
