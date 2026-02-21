import { createRouter, createWebHistory } from 'vue-router'
import NotFoundPage from '../pages/NotFoundPage.vue'
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage.vue'
import LoginPage from '../../features/auth/pages/LoginPage.vue'
import SignupPage from '../../features/auth/pages/SignupPage.vue'
import ReservationCreatePage from '../../features/reservations/pages/ReservationCreatePage.vue'
import ReservationListPage from '../../features/reservations/pages/ReservationListPage.vue'
import { authGuard } from './guards'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginPage },
  { path: '/signup', component: SignupPage, meta: { guestOnly: true } },
  { path: '/forgot-password', component: ForgotPasswordPage, meta: { guestOnly: true } },
  { path: '/reservations/new', component: ReservationCreatePage, meta: { requiresAuth: true } },
  { path: '/reservations', component: ReservationListPage, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', component: NotFoundPage },
]

export function createAppRouter(history = createWebHistory()) {
  const router = createRouter({
    history,
    routes,
  })

  router.beforeEach(authGuard)

  return router
}

const router = createAppRouter()

export default router
