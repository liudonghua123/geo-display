<template>
  <div class="control-bar">
    <select class="control-select" :value="themeId" aria-label="主题" @change="$emit('update:themeId', ($event.target as HTMLSelectElement).value)">
      <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
    <select class="control-select" :value="datasetId" aria-label="着色模式" @change="$emit('update:datasetId', ($event.target as HTMLSelectElement).value)">
      <option v-for="d in datasets" :key="d.id" :value="d.id">{{ d.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { THEMES } from '../themes'
import { DATASETS } from '../datasets/providers'

defineProps<{ themeId: string; datasetId: string }>()
defineEmits<{ 'update:themeId': [v: string]; 'update:datasetId': [v: string] }>()

const themes = THEMES
const datasets = DATASETS
</script>

<style scoped>
.control-bar { display: flex; gap: 8px; }
.control-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  outline: none;
  box-shadow: var(--shadow);
  cursor: pointer;
}
</style>
