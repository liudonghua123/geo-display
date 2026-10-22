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
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
}
.crumb {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
  /* 压缩时均匀收缩，文字截断；flex-shrink 默认按内容宽度比例，
     会把后面的级挤成竖排文字（变窄变高） */
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.crumb.active {
  color: var(--text);
  cursor: default;
  flex-shrink: 0; /* 当前级始终完整展示 */
}
/* 中间级名称较长时优先被截断 */
.crumb:not(.active) { flex-shrink: 2; }
.sep {
  color: var(--text-dim);
  flex-shrink: 0;
}
</style>
