<template>
  <div ref="containerRef" class="map-view" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { geoSource } from '../services/geoSource'
import { getTheme } from '../themes'
import { getDataset, buildVisualMap, colorForRegion, PALETTE } from '../datasets/providers'
import type { RegionNode } from '../types'

const props = defineProps<{
  currentAdcode: number
  currentLevel: RegionNode['level']
  themeId: string
  datasetId: string
}>()

const emit = defineEmits<{
  regionClick: [node: RegionNode]
}>()

const containerRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let renderSeq = 0
/** 已向 ECharts 注册过的地图名，避免重复注册 */
const registeredMaps = new Set<string>()

function regionColor(name: string, index: number): string {
  if (props.datasetId === 'default') {
    return PALETTE[index % PALETTE.length]!
  }
  return colorForRegion(props.datasetId, name) ?? PALETTE[index % PALETTE.length]!
}

/**
 * 唯一的加载+渲染入口：registerMap 与 setOption 由同一序列号守卫，
 * 快速导航时旧请求在 await 恢复后被丢弃，不会交错写入。
 */
async function loadAndRender() {
  if (!chart) return
  const seq = ++renderSeq
  const adcode = props.currentAdcode

  let fc: GeoJSON.FeatureCollection
  try {
    fc = await geoSource.getChildren(adcode)
  } catch {
    // 数据缺失（如台湾省）：静默保持当前视图
    return
  }
  if (seq !== renderSeq) return // 已过期
  if (!chart) return // 已卸载

  // 注册地图（已注册过则跳过）并渲染；理论上有校验兜底不会抛错，
  // 这里仍做防御性捕获，与上方取数失败行为保持一致
  try {
    const mapName = String(adcode)
    if (!registeredMaps.has(mapName)) {
      echarts.registerMap(mapName, fc as Parameters<typeof echarts.registerMap>[1])
      registeredMaps.add(mapName)
    }

    const theme = getTheme(props.themeId)
    const features = fc.features.filter((f) => f.properties?.name)
    const ds = getDataset(props.datasetId)
    const values = ds.getData(props.currentLevel === 'country' ? 'province' : props.currentLevel) as Record<number, number> | null

    const seriesData = features.map((f, i) => {
      const p = f.properties as { adcode: number; name: string; childrenNum: number }
      return {
        name: p.name,
        adcode: p.adcode,
        childrenNum: p.childrenNum,
        value: values?.[p.adcode] ?? undefined,
        itemStyle: values ? undefined : { areaColor: regionColor(p.name, i) },
      }
    })

    const visualMap = values ? buildVisualMap(props.datasetId) : null

    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: { name: string; value?: number }) => {
            const unit = visualMap?.unit ?? ''
            return params.value != null
              ? `${params.name}<br/>${ds.legend.label}: ${params.value}${unit}`
              : params.name
          },
        },
        visualMap: visualMap
          ? {
              type: 'piecewise',
              left: 'left',
              bottom: 'bottom',
              pieces: visualMap.pieces,
              textStyle: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#ccc' },
            }
          : undefined,
        series: [
          {
            type: 'map',
            map: mapName,
            roam: true,
            selectedMode: 'single',
            label: { show: true, fontSize: 11 },
            data: seriesData,
            ...(theme.echarts.mapRegion as Record<string, unknown>),
          },
        ],
      },
      { notMerge: true },
    )
  } catch {
    // 渲染异常：静默保持当前视图
  }
}

function handleResize() {
  chart?.resize()
}

onMounted(async () => {
  if (!containerRef.value) return
  chart = echarts.init(containerRef.value)
  chart.on('click', (params: { name?: string; data?: unknown }) => {
    const d = params.data as { adcode: number; childrenNum: number } | undefined
    // ECharts 会为数据中缺失的区域（如九段线）自动生成仅含 name 的条目，
    // 此时 adcode 为 undefined，不应触发下钻
    if (d && typeof d.adcode === 'number')
      emit('regionClick', { adcode: d.adcode, name: params.name ?? '', level: props.currentLevel })
  })
  window.addEventListener('resize', handleResize)
  await loadAndRender()
})

watch(
  () => [props.currentAdcode, props.themeId, props.datasetId],
  () => {
    void loadAndRender()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  renderSeq++ // 使在途请求过期
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.map-view {
  position: absolute;
  inset: 0;
}
</style>
