<template>
  <div class="control-bar">
    <label class="toggle" title="显示/隐藏区域名称标签">
      <input
        type="checkbox"
        :checked="showLabels"
        aria-label="显示区域名称标签"
        @change="showLabels = ($event.target as HTMLInputElement).checked"
      />
      <span class="track"><span class="thumb" /></span>
      <span class="toggle-text">标签</span>
    </label>
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
import { showLabels } from '../composables/useLabels'

defineProps<{ themeId: string; datasetId: string }>()
defineEmits<{ 'update:themeId': [v: string]; 'update:datasetId': [v: string] }>()

const themes = THEMES
const datasets = DATASETS
</script>

<style scoped>
.control-bar { display: flex; gap: 8px; align-items: center; }
.control-select {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  outline: none;
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
/* iOS 风格开关 */
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  cursor: pointer;
  user-select: none;
}
.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.track {
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: rgba(120, 120, 128, 0.32);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}
.toggle input:checked + .track { background: var(--accent); }
.toggle input:checked + .track .thumb { transform: translateX(12px); }
.toggle input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 1px; }
.toggle-text { font-size: 12px; color: var(--text); }
</style>
