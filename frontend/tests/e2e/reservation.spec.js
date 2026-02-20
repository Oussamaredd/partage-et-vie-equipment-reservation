import { expect, test } from '@playwright/test'
import { AuthPage } from './page-objects/auth.po'
import { ReservationsPage } from './page-objects/reservations.po'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/equipment', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Dell Latitude 7440', reference: 'EQ-LAP-001' },
        { id: 2, name: 'Sony Alpha 7C', reference: 'EQ-CAM-001' },
      ]),
    })
  })
})

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/reservations/new')
  await expect(page).toHaveURL(/\/login$/)
})

test('signup -> login -> reservation happy path', async ({ page }) => {
  const auth = new AuthPage(page)
  const reservations = new ReservationsPage(page)

  await page.route('**/api/auth/signup', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, email: 'new.user@company.test', message: 'Signup completed successfully.' }),
    })
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'jwt-token', email: 'new.user@company.test' }),
    })
  })

  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })

      return
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, message: 'Reservation created successfully.' }),
    })
  })

  await auth.gotoSignup()
  await auth.signup({ email: 'new.user@company.test', password: 'Password123' })
  await auth.login({ email: 'new.user@company.test', password: 'Password123' })

  await reservations.fillDates({ startDate: '2026-03-20T09:00', endDate: '2026-03-20T18:00' })
  await reservations.submit()

  await expect(page.getByTestId('reservation-feedback')).toContainText('Reservation created successfully.')
})

test('forgot/reset password flow', async ({ page }) => {
  const auth = new AuthPage(page)

  await page.route('**/api/auth/forgot-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'If your account exists, a password reset link has been generated.', resetToken: 'reset-token-123' }),
    })
  })

  await page.route('**/api/auth/reset-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password reset successfully.' }),
    })
  })

  await auth.gotoForgotPassword()
  await auth.requestReset('new.user@company.test')
  await expect(page.getByTestId('forgot-generated-token')).toContainText('reset-token-123')

  await auth.resetPassword({ token: 'reset-token-123', newPassword: 'NewPassword123' })
  await expect(page.getByTestId('forgot-feedback')).toContainText('Password reset successfully.')
})

test('authenticated reservation error flows', async ({ page }) => {
  const auth = new AuthPage(page)
  const reservations = new ReservationsPage(page)

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'jwt-token', email: 'employee@company.test' }),
    })
  })

  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })

      return
    }

    const payload = JSON.parse(route.request().postData() || '{}')
    if (payload.startDate > payload.endDate) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'End date must be after start date.' }),
      })

      return
    }

    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Equipment is already reserved for this period.' }),
    })
  })

  await auth.gotoLogin()
  await auth.login({ email: 'employee@company.test', password: 'ChangeMe123' })

  await reservations.fillDates({ startDate: '2026-03-10T10:00', endDate: '2026-03-10T12:00' })
  await reservations.submit()
  await expect(page.getByTestId('reservation-feedback')).toContainText('Equipment is already reserved for this period.')

  await reservations.fillDates({ startDate: '2026-03-20T18:00', endDate: '2026-03-20T09:00' })
  await reservations.submit()
  await expect(page.getByTestId('reservation-feedback')).toContainText('End date must be after start date.')
})
