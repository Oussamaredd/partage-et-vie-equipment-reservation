<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  equipment: { type: Array, default: () => [] },
  loadingEquipment: { type: Boolean, default: false },
  loadingSubmit: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const form = reactive({
  equipmentId: '',
  startDate: '',
  endDate: '',
})

const canSubmit = computed(() => {
  return !props.loadingEquipment && !props.loadingSubmit && form.equipmentId !== ''
})

watch(
  () => props.equipment,
  (items) => {
    if (items.length > 0 && form.equipmentId === '') {
      form.equipmentId = String(items[0].id)
    }
  },
  { immediate: true },
)

function onSubmit() {
  emit('submit', {
    equipmentId: Number(form.equipmentId),
    startDate: form.startDate,
    endDate: form.endDate,
  })
}
</script>

<template>
  <form class="form" data-testid="reservation-form" @submit.prevent="onSubmit">
    <label>
      Equipment
      <select v-model="form.equipmentId" data-testid="reservation-equipment" :disabled="props.loadingEquipment">
        <option v-if="props.equipment.length === 0" value="" disabled>No equipment available</option>
        <option v-for="item in props.equipment" :key="item.id" :value="String(item.id)">
          {{ item.name }} ({{ item.reference }})
        </option>
      </select>
    </label>

    <label>
      Start date
      <input v-model="form.startDate" data-testid="reservation-start-date" type="datetime-local" required />
    </label>

    <label>
      End date
      <input v-model="form.endDate" data-testid="reservation-end-date" type="datetime-local" required />
    </label>

    <button data-testid="reservation-submit" :disabled="!canSubmit" type="submit">
      {{ props.loadingSubmit ? 'Submitting...' : 'Reserve equipment' }}
    </button>
  </form>
</template>
