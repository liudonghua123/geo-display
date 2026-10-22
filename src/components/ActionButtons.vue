<template>
  <div class="action-buttons">
    <button class="action-btn" title="回到全国视图" :disabled="atRoot" @click="$emit('home')">⌂</button>
    <button class="action-btn" title="定位当前位置" :disabled="locating" @click="$emit('locate')">
      {{ locating ? '…' : '📍' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ atRoot: boolean; locating: boolean }>()
defineEmits<{ home: []; locate: [] }>()
</script>

<style scoped>
.action-buttons { display: flex; flex-direction: column; gap: 8px; }
.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 17px;
  cursor: pointer;
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  transition: transform 0.15s ease, border-color 0.2s;
}
.action-btn:hover:not(:disabled) { border-color: var(--accent); }
.action-btn:active:not(:disabled) { transform: scale(0.92); }
.action-btn:disabled { opacity: 0.45; cursor: default; }

@media (max-width: 767px) {
  .action-btn { width: 34px; height: 34px; font-size: 14px; }
}
</style>
