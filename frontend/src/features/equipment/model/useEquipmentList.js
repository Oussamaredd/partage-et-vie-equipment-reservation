import { ref } from 'vue'
import { fetchEquipment } from '../api/equipmentApi'

export function useEquipmentList() {
  const items = ref([])
  const loading = ref(true)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''

    try {
      items.value = await fetchEquipment()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unable to load equipment.'
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    load,
  }
}
