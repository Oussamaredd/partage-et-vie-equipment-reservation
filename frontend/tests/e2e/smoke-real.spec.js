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
  test.setTimeout(90_000)

  const equipmentResponse = await request.get('http://127.0.0.1:8000/api/equipment')
  expect(equipmentResponse.ok()).toBeTruthy()

  const equipment = await equipmentResponse.json()
  expect(Array.isArray(equipment)).toBeTruthy()
  expect(equipment.length).toBeGreaterThan(0)

  const auth = new AuthPage(page)
  const email = buildUniqueEmail()
  const password = 'SmokePass123'

  await auth.gotoSignup()
  const signupResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().includes('/api/auth/signup')
  })
  await auth.signup({ email, password })
  const signupResponse = await signupResponsePromise
  expect(signupResponse.status()).toBe(201)

  await auth.gotoLogin()
  const loginResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().includes('/api/auth/login')
  })
  await auth.login({ email, password })
  const loginResponse = await loginResponsePromise
  expect(loginResponse.status()).toBe(200)
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
})

test('real backend smoke: forgot password keeps generic response', async ({ page }) => {
  test.setTimeout(60_000)

  const auth = new AuthPage(page)

  await auth.gotoForgotPassword()
  const forgotResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().includes('/api/auth/forgot-password')
  })
  await auth.requestReset(buildUniqueEmail())
  const forgotResponse = await forgotResponsePromise
  expect(forgotResponse.status()).toBe(200)
  const forgotPayload = await forgotResponse.json()
  expect(forgotPayload.message).toContain('If your account exists')

  await expect(page.getByTestId('forgot-feedback')).toContainText(
    'If your account exists, a password reset link has been generated.',
    { timeout: 20_000 },
  )
  await expect(page.getByTestId('forgot-generated-token')).toHaveCount(0)
})
