export class AuthPage {
  constructor(page) {
    this.page = page
  }

  async gotoLogin() {
    await this.page.goto('/login')
  }

  async gotoSignup() {
    await this.page.goto('/signup')
  }

  async gotoForgotPassword() {
    await this.page.goto('/forgot-password')
  }

  async signup({ email, password }) {
    await this.page.getByTestId('signup-email').fill(email)
    await this.page.getByTestId('signup-password').fill(password)
    await this.page.getByTestId('signup-submit').click()
  }

  async login({ email, password }) {
    await this.page.getByTestId('login-email').fill(email)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
  }

  async requestReset(email) {
    await this.page.getByTestId('forgot-email').fill(email)
    await this.page.getByTestId('forgot-submit').click()
  }

  async resetPassword({ token, newPassword }) {
    await this.page.getByTestId('reset-token').fill(token)
    await this.page.getByTestId('reset-new-password').fill(newPassword)
    await this.page.getByTestId('reset-submit').click()
  }
}
