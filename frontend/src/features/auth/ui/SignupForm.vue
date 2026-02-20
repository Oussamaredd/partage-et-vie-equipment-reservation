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
  <form class="form" data-testid="signup-form" @submit.prevent="onSubmit">
    <label>
      Email
      <input
        v-model="form.email"
        data-testid="signup-email"
        type="email"
        placeholder="new.user@company.test"
        autocomplete="email"
        required
      />
    </label>
    <label>
      Password
      <input
        v-model="form.password"
        data-testid="signup-password"
        type="password"
        placeholder="At least 8 chars with letters and numbers"
        autocomplete="new-password"
        required
      />
    </label>
    <button data-testid="signup-submit" :disabled="props.loading" type="submit">
      {{ props.loading ? 'Creating account...' : 'Signup' }}
    </button>
  </form>
</template>
