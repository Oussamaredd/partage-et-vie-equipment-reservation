<script setup>
const props = defineProps({
  type: { type: String, default: '' },
  message: { type: String, default: '' },
  testid: { type: String, default: '' },
})
</script>

<template>
  <p v-if="props.message" :data-testid="props.testid" :class="props.type || 'error'">{{ props.message }}</p>
</template>
