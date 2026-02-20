<script setup>
import { reactive } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const form = reactive({
  email: '',
  password: '',
})

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="form" data-testid="login-form" @submit.prevent="onSubmit">
    <label>
      Email
      <input
        v-model="form.email"
        data-testid="login-email"
        type="email"
        placeholder="employee@company.test"
        autocomplete="email"
        required
      />
    </label>
    <label>
      Password
      <input
        v-model="form.password"
        data-testid="login-password"
        type="password"
        placeholder="Enter password"
        autocomplete="current-password"
        required
      />
    </label>
    <button data-testid="login-submit" :disabled="props.loading" type="submit">
      {{ props.loading ? 'Authenticating...' : 'Login' }}
    </button>
  </form>
</template>
