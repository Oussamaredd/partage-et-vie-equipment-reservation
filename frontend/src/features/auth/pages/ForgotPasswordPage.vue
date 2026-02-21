<script setup>
import { ref } from 'vue'
import FeedbackMessage from '../../../shared/ui/FeedbackMessage.vue'
import { resetPasswordByEmail } from '../api/authApi'
import ForgotPasswordRequestForm from '../ui/ForgotPasswordRequestForm.vue'

const feedback = ref({ type: '', message: '' })

async function onResetPassword(payload) {
  feedback.value = { type: '', message: '' }

  try {
    const response = await resetPasswordByEmail(payload)
    feedback.value = { type: 'ok', message: response.message }
  } catch (error) {
    feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'Reset failed.' }
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <p class="panel-eyebrow">Account Recovery</p>
      <h1>Forgot Password</h1>
      <p class="panel-subtitle">Enter your account email and choose a new password.</p>
    </header>

    <section class="form-block">
      <p class="block-title">Reset your password</p>
      <ForgotPasswordRequestForm @submit="onResetPassword" />
    </section>

    <FeedbackMessage testid="forgot-feedback" :type="feedback.type" :message="feedback.message" />
    <p class="inline-links"><RouterLink to="/login">Back to login</RouterLink></p>
  </section>
</template>
