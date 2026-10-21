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
  /** 定位点经纬度（[lng, lat]），null 表示无定位标记 */
  locatePoint?: [number, number] | null
}>()

const emit = defineEmits<{
  regionClick: [node: RegionNode]
}>()

const containerRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let renderSeq = 0
/** 已向 ECharts 注册过的地图名，避免重复注册 */
const registeredMaps = new Set<string>()

/** 当前视图层级 → 其子区域层级（点击的区域属于子级，路径节点应携带其自身层级） */
const CHILD_LEVEL: Record<RegionNode['level'], Exclude<RegionNode['level'], 'country'>> = {
  country: 'province',
  province: 'city',
  city: 'district',
  district: 'district', // 区县级为叶子，仅兜底
}

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
    // getData 应传入"当前渲染要素"的层级（即 currentLevel 的子级）：
    // currentLevel='province' 时渲染的是市，传入 'province' 会错用省级数据 → value 全为 NaN
    const values = ds.getData(CHILD_LEVEL[props.currentLevel]) as Record<number, number> | null

    const seriesData = features.map((f) => {
      const p = f.properties as { adcode: number; name: string; childrenNum: number }
      return {
        name: p.name,
        adcode: p.adcode,
        childrenNum: p.childrenNum,
        value: values?.[p.adcode] ?? undefined,
      }
    })

    // geoIndex 绑定下，系列级 itemStyle/label 会被忽略（区域模型只来自 geo.regions），
    // 因此无值模式（默认/彩虹/渐变）的逐区域配色必须放到 geo.regions
    const regions = values
      ? undefined
      : features.map((f, i) => {
          const name = (f.properties as { name: string }).name
          return { name, itemStyle: { areaColor: regionColor(name, i) } }
        })

    // 仅用于 tooltip 单位；图例由 LegendPanel 呈现，
    // values 模式下用隐藏的 piecewise visualMap 驱动分档填色
    const visualMap = values ? buildVisualMap(props.datasetId) : null

    chart.setOption(
      {
        backgroundColor: 'transparent',
        ...(visualMap
          ? {
              visualMap: {
                show: false,
                type: 'piecewise' as const,
                seriesIndex: 0,
                pieces: visualMap.pieces,
              },
            }
          : {}),
        tooltip: {
          trigger: 'item',
          formatter: (params: { name: string; value?: number | number[] }) => {
            const unit = visualMap?.unit ?? ''
            // 定位点（effectScatter）的 value 是 [lng, lat] 数组；
            // ECharts 会把缺失的数值维度填充为 NaN（typeof NaN === 'number'），
            // 两者都不应作为数值展示
            return Number.isFinite(params.value)
              ? `${params.name}<br/>${ds.legend.label}: ${params.value}${unit}`
              : params.name
          },
        },
        series: [
          {
            type: 'map',
            map: mapName,
            geoIndex: 0,
            roam: false,
            selectedMode: 'single',
            data: seriesData,
          },
          ...(props.locatePoint
            ? [{
                type: 'effectScatter' as const,
                coordinateSystem: 'geo' as const,
                geoIndex: 0,
                zlevel: 2,
                symbolSize: 10,
                rippleEffect: { scale: 3 },
                itemStyle: { color: '#ff4d4f' },
                data: [{ value: props.locatePoint, name: '当前位置' }],
              }]
            : []),
        ],
        geo: {
          map: mapName,
          roam: true,
          // 标签来自 geo 区域模型（geoIndex 绑定下系列 label 被忽略）
          label: { show: true, fontSize: 11 },
          ...(theme.echarts.mapRegion as Record<string, unknown>),
          // 逐区域配色必须放在 geo.regions（geoIndex 绑定下系列 itemStyle 被忽略），
          // 放在主题 spread 之后以防主题键覆盖
          ...(regions ? { regions } : {}),
        },
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
      emit('regionClick', { adcode: d.adcode, name: params.name ?? '', level: CHILD_LEVEL[props.currentLevel] })
  })
  window.addEventListener('resize', handleResize)
  await loadAndRender()
})

watch(
  () => [props.currentAdcode, props.themeId, props.datasetId, props.locatePoint],
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
