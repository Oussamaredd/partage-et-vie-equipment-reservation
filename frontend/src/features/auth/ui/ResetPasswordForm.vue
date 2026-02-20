<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({
  token: '',
  newPassword: '',
})

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="form" data-testid="reset-form" @submit.prevent="onSubmit">
    <label>
      Reset token
      <input v-model="form.token" data-testid="reset-token" type="text" placeholder="Paste reset token" required />
    </label>
    <label>
      New password
      <input
        v-model="form.newPassword"
        data-testid="reset-new-password"
        type="password"
        placeholder="New password"
        autocomplete="new-password"
        required
      />
    </label>
    <button data-testid="reset-submit" type="submit">Reset password</button>
  </form>
</template>
