<script setup>
import { ref } from 'vue'
import FeedbackMessage from '../../../shared/ui/FeedbackMessage.vue'
import { requestPasswordReset, resetPassword } from '../api/authApi'
import ForgotPasswordRequestForm from '../ui/ForgotPasswordRequestForm.vue'
import ResetPasswordForm from '../ui/ResetPasswordForm.vue'

const feedback = ref({ type: '', message: '' })
const generatedToken = ref('')

async function onRequestReset(payload) {
  feedback.value = { type: '', message: '' }

  try {
    const response = await requestPasswordReset(payload)
    feedback.value = { type: 'ok', message: response.message }
    generatedToken.value = response.resetToken ?? ''
  } catch (error) {
    feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'Request failed.' }
  }
}

async function onResetPassword(payload) {
  feedback.value = { type: '', message: '' }

  try {
    const response = await resetPassword(payload)
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
      <p class="panel-subtitle">Request a reset token, then set a new secure password.</p>
    </header>

    <section class="form-block">
      <p class="block-title">1. Request reset token</p>
      <ForgotPasswordRequestForm @submit="onRequestReset" />
    </section>

    <p v-if="generatedToken" data-testid="forgot-generated-token" class="ok">Reset token (dev only): <code>{{ generatedToken }}</code></p>

    <section class="form-block">
      <p class="block-title">2. Choose new password</p>
      <ResetPasswordForm @submit="onResetPassword" />
    </section>

    <FeedbackMessage testid="forgot-feedback" :type="feedback.type" :message="feedback.message" />
    <p class="inline-links"><RouterLink to="/login">Back to login</RouterLink></p>
  </section>
</template>
