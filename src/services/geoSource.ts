import type { RegionMeta } from '../types'

/** 地图数据源接口（可扩展点：可替换为远程/自定义数据源） */
export interface GeoSource {
  /** 获取某 adcode 的子级 FeatureCollection（含缓存） */
  getChildren(adcode: number): Promise<GeoJSON.FeatureCollection>
  /** 读取搜索索引 */
  getIndex(): Promise<RegionMeta[]>
}

const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>()

export class LocalGeoSource implements GeoSource {
  constructor(private baseUrl = '/geo') {}

  async getChildren(adcode: number): Promise<GeoJSON.FeatureCollection> {
    const key = String(adcode)
    let p = cache.get(key)
    if (!p) {
      p = fetch(`${this.baseUrl}/${key}_full.json`).then(async (res) => {
        if (!res.ok) throw new Error(`加载 ${key} 数据失败: HTTP ${res.status}`)
        return res.json()
      })
      cache.set(key, p)
      // 失败时清掉缓存以便重试
      p.catch(() => cache.delete(key))
    }
    return p
  }

  async getIndex(): Promise<RegionMeta[]> {
    const res = await fetch(`${this.baseUrl}/search-index.json`)
    if (!res.ok) throw new Error('加载搜索索引失败')
    return res.json()
  }
}

export const geoSource: GeoSource = new LocalGeoSource()

/** 判断某 feature 是否可下钻：以 DataV 的 childrenNum 为准 */
export function canDrillDown(childrenNum: number | undefined): boolean {
  return (childrenNum ?? 0) > 0
}
