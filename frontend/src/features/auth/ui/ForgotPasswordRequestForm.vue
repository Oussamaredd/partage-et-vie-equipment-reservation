<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({
  email: '',
  newPassword: '',
})

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
    <label>
      New password
      <input
        v-model="form.newPassword"
        data-testid="forgot-new-password"
        type="password"
        placeholder="New password"
        autocomplete="new-password"
        required
      />
    </label>
    <button data-testid="forgot-submit" type="submit">Reset password</button>
  </form>
</template>
