<template>
  <div class="app">
    <AuroraBackground />
    <MapView
      :current-adcode="current.adcode"
      :current-level="current.level"
      :theme-id="themeId"
      :dataset-id="datasetId"
      :locate-point="position"
      @region-click="onRegionClick"
    />

    <header class="top-bar">
      <div class="top-left">
        <SearchBox @select="onSearchSelect" />
        <Breadcrumb :path="path" @go-to="goTo" />
      </div>
      <h1 class="title">中国行政区划地图</h1>
      <ControlBar v-model:theme-id="themeId" v-model:dataset-id="datasetId" />
    </header>

    <div class="bottom-left">
      <LegendPanel :dataset-id="datasetId" :current-level="current.level" />
    </div>
    <div class="bottom-right">
      <ActionButtons :at-root="current.level === 'country'" :locating="locateState === 'locating'"
        @home="goTo(0)" @locate="onLocate" />
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MapView from './components/MapView.vue'
import AuroraBackground from './components/AuroraBackground.vue'
import SearchBox from './components/SearchBox.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import ControlBar from './components/ControlBar.vue'
import ActionButtons from './components/ActionButtons.vue'
import LegendPanel from './components/LegendPanel.vue'
import { useDrilldown } from './composables/useDrilldown'
import { useTheme } from './composables/useTheme'
import { useLocator } from './composables/useLocator'
import { geoSource } from './services/geoSource'
import type { RegionMeta, RegionNode } from './types'

const { path, current, enter, goTo } = useDrilldown()
const { themeId } = useTheme()
const datasetId = ref('default')
const { state: locateState, position, locate } = useLocator()
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2500)
}

/** 点击区域下钻（叶子节点不下钻） */
async function onRegionClick(node: RegionNode) {
  let fc: GeoJSON.FeatureCollection
  try {
    fc = await geoSource.getChildren(current.value.adcode)
  } catch {
    showToast(`加载 ${current.value.name} 下级数据失败`)
    return
  }
  const hit = fc.features.find(
    (f) => (f.properties as { adcode: number }).adcode === node.adcode,
  )
  const childrenNum = (hit?.properties as { childrenNum?: number } | undefined)?.childrenNum ?? 0
  if (childrenNum === 0) {
    showToast(`${node.name} 无下级区划数据`)
    return
  }
  enter(node)
}

/** 搜索选中：重建路径（全国 → … → 目标），MapView 通过 adcode 变化自动渲染 */
async function onSearchSelect(meta: RegionMeta) {
  const chain: RegionNode[] = []
  const idx = await geoSource.getIndex()
  const byAdcode = new Map(idx.map((r) => [r.adcode, r]))
  let cur: RegionMeta | undefined = meta
  while (cur) {
    chain.unshift({ adcode: cur.adcode, name: cur.name, level: cur.level })
    cur = cur.parentAdcode && cur.parentAdcode !== 100000
      ? byAdcode.get(cur.parentAdcode)
      : undefined
  }
  // 先跳回全国，再沿链逐级 enter，保证路径完整
  goTo(0)
  for (const node of chain) enter(node)
}

async function onLocate() {
  const { chain, target } = await locate(100000)
  if (locateState.value === 'denied') return showToast('定位权限被拒绝，请在浏览器中允许定位')
  if (locateState.value === 'failed') return showToast('定位失败，请重试')
  if (!chain.length) return showToast('无法确定所在区域')
  goTo(0)
  // 定位到命中区域的"自身边界"视图（如所在的区/市/省），并沿链重建面包屑
  if (target) {
    for (const node of chain) {
      if (node.adcode === target.adcode) break
      enter(node)
    }
    enter({ adcode: target.adcode, name: chain[chain.length - 1]!.name, level: target.level })
    position.value = null // 定位点在自身边界视图内无意义（地图即所在区域）
    showToast(`当前位于：${chain.map((n) => n.name).join(' › ')}`)
    return
  }
  for (const node of chain) enter(node)
  showToast(`当前位于：${chain.map((n) => n.name).join(' › ')}`)
}

onMounted(() => {
  if (!('geolocation' in navigator)) showToast('当前浏览器不支持定位')
})
</script>

<style>
:root {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC',
    'Microsoft YaHei', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}
/* 苹果风格标题：SF 系字体栈 + 大字号 + 渐变文字 */
.title {
  margin: 6px 0 0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC',
    'Microsoft YaHei', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 3px;
  background: linear-gradient(120deg, #ff6ec4 0%, #a78bfa 45%, #4facfe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  z-index: 10;
  pointer-events: none;
}
.top-bar > * { pointer-events: auto; }
.top-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.title {
  margin: 6px 0 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text);
  text-shadow: 0 0 12px var(--accent);
}
.bottom-left {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 10;
}
.bottom-right {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 10;
}
.toast {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  font-size: 13px;
  z-index: 30;
}

/* 平板 */
@media (max-width: 1023px) {
  .title { display: none; }
}
/* 手机 */
@media (max-width: 767px) {
  .top-bar { padding: 10px 12px; }
  .top-left { width: 100%; }
  .top-left :first-child { width: 100%; }
  .top-bar { flex-wrap: wrap; }
}</style>
