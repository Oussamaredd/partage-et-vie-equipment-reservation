export class ReservationsPage {
  constructor(page) {
    this.page = page
  }

  async gotoList() {
    await this.page.goto('/reservations')
  }

  async fillDates({ startDate, endDate }) {
    await this.page.getByTestId('reservation-start-date').fill(startDate)
    await this.page.getByTestId('reservation-end-date').fill(endDate)
  }

  async submit() {
    await this.page.getByTestId('reservation-submit').click()
  }

  async clickPanelDelete() {
    await this.page.getByTestId('reservation-delete-top-right').click()
  }
}
