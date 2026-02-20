import { useAuthSession } from '../../features/auth/model/useAuthSession'

export function authGuard(to) {
  const auth = useAuthSession()

  if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    return '/login'
  }

  if (to.meta.guestOnly && auth.isAuthenticated()) {
    return '/reservations/new'
  }

  return true
}
