import { ref, shallowRef } from 'vue'
import type { RegionMeta } from '../types'
import { queryIndex } from '../services/searchIndex'
import { geoSource } from '../services/geoSource'

/** 搜索：加载索引 + 防抖查询 */
export function useSearch() {
  const index = shallowRef<RegionMeta[]>([])
  const query = ref('')
  const results = ref<RegionMeta[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function ensureIndex() {
    if (index.value.length === 0 && !loading.value) {
      loading.value = true
      try {
        index.value = await geoSource.getIndex()
      } finally {
        loading.value = false
      }
    }
  }

  function onInput(value: string) {
    query.value = value
    clearTimeout(timer)
    timer = setTimeout(() => {
      results.value = queryIndex(index.value, query.value).slice(0, 12)
    }, 150)
  }

  return { query, results, loading, ensureIndex, onInput }
}
