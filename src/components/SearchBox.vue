<template>
  <div class="search-box">
    <input
      class="search-input"
      type="text"
      :value="query"
      placeholder="搜索省 / 市 / 区县 / 拼音 / 首字母…"
      @input="onInput(($event.target as HTMLInputElement).value).catch(() => {})"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.esc="clear"
    />
    <ul v-if="results.length && focused" class="results">
      <li v-for="r in results" :key="r.adcode" @mousedown.prevent="select(r)">
        <span class="name">{{ r.name }}</span>
        <span class="path">{{ r.path.join(' › ') }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSearch } from '../composables/useSearch'
import type { RegionMeta } from '../types'

const emit = defineEmits<{ select: [meta: RegionMeta] }>()

const { query, results, ensureIndex, onInput } = useSearch()
const focused = ref(false)

onMounted(() => void ensureIndex())

function select(r: RegionMeta) {
  emit('select', r)
  clear()
}

function clear() {
  onInput('').catch(() => {})
  results.value = []
}
</script>

<style scoped>
.search-box { position: relative; }
.search-input {
  width: 260px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  outline: none;
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--hover), var(--shadow);
}
.results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  max-height: 320px;
  overflow-y: auto;
  z-index: 20;
}
.results li {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--text);
}
.results li:hover { background: var(--hover); }
.results .path { color: var(--text-dim); font-size: 11px; white-space: nowrap; }

@media (max-width: 767px) {
  .search-input { width: 100%; }
}
</style>
