/** 行政区划层级 */
export type Level = 'country' | 'province' | 'city' | 'district'

/** 搜索索引条目（构建期由 fetch-geo.mjs 生成） */
export interface RegionMeta {
  /** 6 位行政区划代码，如 330100 */
  adcode: number
  name: string
  /** 中文名去掉后缀的简称，如 "浙江省"→"浙江"，"内蒙古自治区"→"内蒙古" */
  shortName: string
  fullPinyin: string
  /** 拼音首字母，如 "zj" */
  pinyinInitials: string
  level: Exclude<Level, 'country'>
  parentAdcode: number | null
  /** 直接父级名称，用于下拉展示上下文，如 ["浙江省"] */
  path: string[]
}

/** 下钻路径中的一站 */
export interface RegionNode {
  adcode: number
  name: string
  level: Level
}

/** DataV GeoJSON feature.properties 的子集 */
export interface GeoFeatureProps {
  adcode: number
  name: string
  childrenNum: number
  level: string
  centroid?: [number, number]
  center?: [number, number]
}

/** 数据集（着色）接口 */
export interface DatasetProvider {
  id: string
  name: string
  /** 返回 adcode → 数值；无数据返回 null */
  getData(level: Exclude<Level, 'country'>): Record<number, number> | null
  legend: { label: string; unit?: string }
}

/** 主题定义：CSS 变量组 + ECharts 主题对象 */
export interface ThemeDef {
  id: string
  name: string
  cssVars: Record<string, string>
  echarts: Record<string, unknown>
}
