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
  backdrop-filter: blur(8px);
}
.action-btn:hover:not(:disabled) { border-color: var(--accent); }
.action-btn:disabled { opacity: 0.45; cursor: default; }
</style>
