import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/features/equipment/api/equipmentApi', () => ({
  fetchEquipment: vi.fn(),
}))

vi.mock('../../src/features/reservations/api/reservationApi', () => ({
  createReservation: vi.fn(),
  listReservations: vi.fn(),
  deleteReservation: vi.fn(),
}))

import { useEquipmentList } from '../../src/features/equipment/model/useEquipmentList'
import { useReservationForm } from '../../src/features/reservations/model/useReservationForm'
import { useReservationList } from '../../src/features/reservations/model/useReservationList'
import { fetchEquipment } from '../../src/features/equipment/api/equipmentApi'
import { createReservation, deleteReservation, listReservations } from '../../src/features/reservations/api/reservationApi'

describe('Reservation and equipment models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads equipment list successfully', async () => {
    fetchEquipment.mockResolvedValue([{ id: 1, name: 'Laptop', reference: 'EQ-LAP-001' }])

    const model = useEquipmentList()
    await model.load()

    expect(model.loading.value).toBe(false)
    expect(model.error.value).toBe('')
    expect(model.items.value).toEqual([{ id: 1, name: 'Laptop', reference: 'EQ-LAP-001' }])
  })

  it('exposes readable error when equipment loading fails', async () => {
    fetchEquipment.mockRejectedValue(new Error('Network down'))

    const model = useEquipmentList()
    await model.load()

    expect(model.loading.value).toBe(false)
    expect(model.error.value).toBe('Network down')
  })

  it('sets success feedback after reservation submission', async () => {
    createReservation.mockResolvedValue({ message: 'Reservation created successfully.' })

    const model = useReservationForm()
    await model.submit({ equipmentId: 1 }, 'jwt-token')

    expect(model.loading.value).toBe(false)
    expect(model.feedback.value).toEqual({ type: 'ok', message: 'Reservation created successfully.' })
  })

  it('sets error feedback after reservation submission failure', async () => {
    createReservation.mockRejectedValue(new Error('Conflict'))

    const model = useReservationForm()
    await model.submit({ equipmentId: 1 }, 'jwt-token')

    expect(model.loading.value).toBe(false)
    expect(model.feedback.value).toEqual({ type: 'error', message: 'Conflict' })
  })

  it('loads reservations and handles deletion workflow', async () => {
    listReservations
      .mockResolvedValueOnce([
        { id: 10, email: 'employee@company.test', equipment: { name: 'Laptop' } },
      ])
      .mockResolvedValueOnce([])
    deleteReservation.mockResolvedValue({ message: 'Reservation deleted successfully.' })

    const model = useReservationList()
    await model.load('jwt-token')

    expect(model.loading.value).toBe(false)
    expect(model.items.value).toHaveLength(1)

    await model.remove(10, 'jwt-token')

    expect(model.deletingId.value).toBeNull()
    expect(model.actionError.value).toBe('')
    expect(model.actionMessage.value).toBe('Reservation deleted successfully.')
    expect(model.items.value).toEqual([])
  })

  it('surfaces delete action error when deletion fails', async () => {
    listReservations.mockResolvedValue([])
    deleteReservation.mockRejectedValue(new Error('Reservation not found.'))

    const model = useReservationList()
    await model.remove(404, 'jwt-token')

    expect(model.deletingId.value).toBeNull()
    expect(model.actionMessage.value).toBe('')
    expect(model.actionError.value).toBe('Reservation not found.')
  })
})
