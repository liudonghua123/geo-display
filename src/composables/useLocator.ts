import { ref } from 'vue'
import { findRegionAt } from '../services/pointInPolygon'
import { geoSource, canDrillDown } from '../services/geoSource'
import type { RegionNode } from '../types'

export type LocateState = 'idle' | 'locating' | 'success' | 'denied' | 'failed'

/** 定位结果：命中链 + 建议展示的目标视图（命中区域的自身边界） */
export interface LocateResult {
  chain: RegionNode[]
  /** 命中最深区域 { adcode, level }；其自身边界地图可展示；null 表示无 */
  target: { adcode: number; level: RegionNode['level'] } | null
}

/** DataV feature 的 properties 子集（用于定位命中判断） */
interface LocateFeatureProps {
  adcode: number
  name: string
  level: string
  childrenNum: number
  [k: string]: unknown
}

/** 与 pointInPolygon 内部 Geometry 兼容的结构 */
interface LocateGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

/**
 * 地理定位：浏览器 Geolocation API（不引入 IP 定位）。
 * 成功后从当前层级逐级向下判断点所在区域，返回标记点与逐级命中的路径。
 */
export function useLocator() {
  const state = ref<LocateState>('idle')
  const position = ref<[number, number] | null>(null)

  async function locate(startAdcode: number): Promise<LocateResult> {
    state.value = 'locating'
    if (!('geolocation' in navigator)) {
      state.value = 'failed'
      return { chain: [], target: null }
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        })
      })
      const pt: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      position.value = pt
      state.value = 'success'

      // 从 startAdcode 逐级向下定位：省 → 市 → 区县
      const chain: RegionNode[] = []
      let adcode = startAdcode
      let boundary: { adcode: number; level: RegionNode['level'] } | null = null
      for (let depth = 0; depth < 3; depth++) {
        const fc = await geoSource.getChildren(adcode)
        // GeoJSON.FeatureCollection 的 properties 为 GeoJsonProperties（可空），此处收窄为 DataV 的子集
        const hit = findRegionAt(
          fc as unknown as { features: Array<{ properties: LocateFeatureProps; geometry: LocateGeometry | null }> },
          pt,
        )
        if (!hit) break
        const props = hit.properties
        chain.push({ adcode: props.adcode, name: props.name, level: props.level as RegionNode['level'] })
        // 命中区域的层级（省/市/区）决定定位链可到达的最深层级
        const lvl = props.level
        if (lvl === 'province' || lvl === 'city' || lvl === 'district') {
          boundary = { adcode: props.adcode, level: lvl }
        }
        if (!canDrillDown(props.childrenNum)) break
        adcode = props.adcode
      }
      // 命中最深层级的区域自身边界：
      // 1) 命中区不可下钻（叶子）时 getChildren 会抛错，需用自身边界地图展示
      // 2) 可下钻时也停在命中层级，不展开下一级（"定位到所在区"而非"进入它的子级"）
      // 自身边界缺失（如 fetch 失败）时退回链尾视图
      if (boundary) {
        try {
          await geoSource.getBoundary(boundary.adcode)
          return { chain, target: boundary }
        } catch {
          /* fall through：无自身边界数据，按链尾子级展示 */
        }
      }
      return { chain, target: null }
    } catch (e) {
      state.value = 'failed'
      if (e && typeof e === 'object' && 'code' in e && (e as { code: number }).code === 1) {
        state.value = 'denied' // PERMISSION_DENIED
      }
      return { chain: [], target: null }
    }
  }

  return { state, position, locate }
}
