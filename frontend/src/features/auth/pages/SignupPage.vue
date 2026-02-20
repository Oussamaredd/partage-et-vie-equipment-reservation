<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FeedbackMessage from '../../../shared/ui/FeedbackMessage.vue'
import { signup } from '../api/authApi'
import SignupForm from '../ui/SignupForm.vue'

const router = useRouter()
const loading = ref(false)
const feedback = ref({ type: '', message: '' })

async function onSubmit(payload) {
  loading.value = true
  feedback.value = { type: '', message: '' }

  try {
    const response = await signup(payload)
    feedback.value = { type: 'ok', message: response.message }
    await router.push('/login')
  } catch (error) {
    feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'Signup failed.' }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <p class="panel-eyebrow">Account Setup</p>
      <h1>Signup</h1>
      <p class="panel-subtitle">Create your workspace account to start reserving equipment.</p>
    </header>

    <SignupForm :loading="loading" @submit="onSubmit" />
    <FeedbackMessage testid="signup-feedback" :type="feedback.type" :message="feedback.message" />
    <p class="inline-links"><RouterLink to="/login">Back to login</RouterLink></p>
  </section>
</template>
