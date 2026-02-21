<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/authApi'
import { useAuthSession } from '../model/useAuthSession'
import LoginForm from '../ui/LoginForm.vue'
import FeedbackMessage from '../../../shared/ui/FeedbackMessage.vue'

const router = useRouter()
const auth = useAuthSession()
const loading = ref(false)
const feedback = ref('')

async function onSubmit(payload) {
  loading.value = true
  feedback.value = ''

  try {
    const response = await login(payload)
    auth.setAuth(response.token, response.email)
    await router.push('/reservations/new')
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Login failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <p class="panel-eyebrow">Secure Access</p>
      <h1>Login</h1>
      <p class="panel-subtitle">Use your credentials to manage reservations and track your current bookings.</p>
    </header>

    <section class="form-block">
      <p class="block-title">Your credentials</p>
      <LoginForm :loading="loading" @submit="onSubmit" />
    </section>
    <FeedbackMessage testid="login-feedback" type="error" :message="feedback" />
    <p class="inline-links"><RouterLink to="/signup">Create account</RouterLink> | <RouterLink to="/forgot-password">Forgot password</RouterLink></p>
  </section>
</template>
