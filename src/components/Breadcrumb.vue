<template>
  <nav class="breadcrumb">
    <template v-for="(node, i) in path" :key="node.adcode">
      <span v-if="i > 0" class="sep">›</span>
      <button class="crumb" :class="{ active: i === path.length - 1 }" @click="$emit('goTo', i)">
        {{ node.name }}
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { RegionNode } from '../types'

defineProps<{ path: RegionNode[] }>()
defineEmits<{ goTo: [depth: number] }>()
</script>

<style scoped>
.breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  font-size: 12px;
}
.crumb {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
}
.crumb.active { color: var(--text); cursor: default; }
.sep { color: var(--text-dim); }
</style>
