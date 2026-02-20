<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({ email: '' })

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="form" data-testid="forgot-request-form" @submit.prevent="onSubmit">
    <label>
      Account email
      <input
        v-model="form.email"
        data-testid="forgot-email"
        type="email"
        placeholder="employee@company.test"
        autocomplete="email"
        required
      />
    </label>
    <button data-testid="forgot-submit" type="submit">Generate reset token</button>
  </form>
</template>
