import { expect, test } from '@playwright/test'
import { AuthPage } from './page-objects/auth.po'

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateTimeLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildUniqueSlot() {
  const base = new Date('2035-01-01T09:00:00')
  const randomMinutes = Math.floor(Math.random() * 5 * 365 * 24 * 60)
  const start = new Date(base.getTime() + randomMinutes * 60 * 1000)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  return {
    startDate: toDateTimeLocalInputValue(start),
    endDate: toDateTimeLocalInputValue(end),
  }
}

function buildUniqueEmail() {
  return `smoke.${Date.now()}${Math.floor(Math.random() * 10_000)}@company.test`
}

test('real backend smoke: signup -> login -> create reservation', async ({ page, request }) => {
  test.setTimeout(120_000)

  const equipmentResponse = await request.get('http://127.0.0.1:8000/api/equipment')
  expect(equipmentResponse.ok()).toBeTruthy()

  const equipment = await equipmentResponse.json()
  expect(Array.isArray(equipment)).toBeTruthy()
  expect(equipment.length).toBeGreaterThan(0)

  const auth = new AuthPage(page)
  const email = buildUniqueEmail()
  const password = 'SmokePass123'

  const signupResponse = await request.post('http://127.0.0.1:8000/api/auth/signup', {
    data: { email, password },
  })
  expect(signupResponse.status()).toBe(201)

  await auth.gotoLogin()
  await auth.login({ email, password })
  await expect(page).toHaveURL(/\/reservations\/new$/, { timeout: 20_000 })

  const token = await page.evaluate(() => localStorage.getItem('auth_token') ?? '')
  expect(token).not.toBe('')

  const slot = buildUniqueSlot()
  const createReservationResponse = await request.post('http://127.0.0.1:8000/api/reservations', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      equipmentId: equipment[0].id,
      startDate: slot.startDate,
      endDate: slot.endDate,
    },
  })
  expect(createReservationResponse.status()).toBe(201)
  const createdReservation = await createReservationResponse.json()
  expect(createdReservation.message).toContain('Reservation created successfully.')

  const listResponse = await request.get('http://127.0.0.1:8000/api/reservations', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(listResponse.status()).toBe(200)
  const reservations = await listResponse.json()
  expect(Array.isArray(reservations)).toBeTruthy()
  expect(reservations.some((reservation) => reservation.id === createdReservation.id)).toBeTruthy()

  await page.goto('/reservations')
  await expect(page).toHaveURL(/\/reservations$/)
  await expect(page.getByRole('heading', { name: 'My Reservations' })).toBeVisible()
  await page.getByTestId('reservation-delete-top-right').click()
  await expect(page.getByTestId('reservation-delete-feedback')).toContainText('Reservation deleted successfully.')

  const listAfterDeleteResponse = await request.get('http://127.0.0.1:8000/api/reservations', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(listAfterDeleteResponse.status()).toBe(200)
  const reservationsAfterDelete = await listAfterDeleteResponse.json()
  expect(reservationsAfterDelete.some((reservation) => reservation.id === createdReservation.id)).toBeFalsy()
})

test('real backend smoke: forgot password resets account password', async ({ page, request }) => {
  test.setTimeout(120_000)

  const auth = new AuthPage(page)
  const email = buildUniqueEmail()
  const password = 'SmokePass123'
  const newPassword = 'SmokePass456'

  const signupResponse = await request.post('http://127.0.0.1:8000/api/auth/signup', {
    data: { email, password },
  })
  expect(signupResponse.status()).toBe(201)

  const forgotResponse = await request.post('http://127.0.0.1:8000/api/auth/forgot-password', {
    data: { email, newPassword },
  })
  expect(forgotResponse.status()).toBe(200)

  await auth.gotoLogin()
  await auth.login({ email, password: newPassword })
  await expect(page).toHaveURL(/\/reservations\/new$/, { timeout: 20_000 })
})
