<template>
  <div v-if="vm" class="legend-panel">
    <div class="legend-title">{{ title }}</div>
    <div v-for="p in vm.pieces" :key="p.label" class="legend-item">
      <span class="swatch" :style="{ background: p.color }" />
      <span>{{ p.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDataset, buildVisualMap } from '../datasets/providers'

const props = defineProps<{ datasetId: string }>()

const vm = computed(() => buildVisualMap(props.datasetId))
const title = computed(() => {
  const ds = getDataset(props.datasetId)
  return ds.legend.unit ? `${ds.legend.label}（${ds.legend.unit}）` : ds.legend.label
})
</script>

<style scoped>
.legend-panel {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  font-size: 12px;
  color: var(--text);
}
.legend-title { font-weight: 600; margin-bottom: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.swatch { width: 14px; height: 10px; border-radius: 2px; }
</style>
