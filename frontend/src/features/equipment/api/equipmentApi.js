import { apiRequest } from '../../../shared/api/httpClient'

export function fetchEquipment() {
  return apiRequest('/api/equipment')
}
