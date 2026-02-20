<script setup>
import { useRouter } from 'vue-router'
import { useAuthSession } from '../../features/auth/model/useAuthSession'

const auth = useAuthSession()
const router = useRouter()

function onLogout() {
  auth.clearAuth()
  router.push('/login')
}
</script>

<template>
  <main class="page">
    <header class="brand-header" v-if="!auth.state.token">
      <p class="brand-kicker">Partage et Vie</p>
      <h1 class="brand-title">Equipment Reservation Portal</h1>
      <p class="brand-subtitle">
        Professional scheduling for shared team equipment.
      </p>
    </header>

    <header class="app-header" v-else>
      <div class="app-header__identity">
        <p class="brand-kicker">Partage et Vie</p>
        <p class="app-title">Equipment Reservation</p>
        <p class="signed-in">Signed in as {{ auth.state.email }}</p>
      </div>
      <nav class="app-nav">
        <RouterLink to="/reservations/new">New reservation</RouterLink>
        <RouterLink to="/reservations">My reservations</RouterLink>
      </nav>
      <button class="logout" type="button" @click="onLogout">Logout</button>
    </header>

    <section class="content-area">
      <slot />
    </section>
  </main>
</template>
