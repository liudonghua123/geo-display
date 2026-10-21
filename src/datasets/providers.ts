import type { DatasetProvider, Level } from '../types'
import { PROVINCE_AREA } from './sample-data'

/** 美观调色板（深浅主题下均可读） */
export const PALETTE = [
  '#4dabf7', '#69db7c', '#ffd43b', '#ff8787', '#b197fc',
  '#66d9e8', '#ffa94d', '#f783ac', '#63e6be', '#a9e34b',
  '#748ffc', '#f1c0e8',
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export const DATASETS: DatasetProvider[] = [
  {
    id: 'default',
    name: '默认配色',
    legend: { label: '' },
    getData: () => null,
  },
  {
    id: 'rainbow',
    name: '彩虹模式',
    legend: { label: '' },
    getData: () => null,
  },
  {
    id: 'gradient',
    name: '单色渐变',
    legend: { label: '' },
    getData: () => null,
  },
  {
    id: 'area',
    name: '省域面积',
    legend: { label: '陆地面积', unit: '万km²' },
    getData: (level: Level) => (level === 'province' ? PROVINCE_AREA : null),
  },
]

export function getDataset(id: string): DatasetProvider {
  return DATASETS.find((d) => d.id === id) ?? DATASETS[0]!
}

export interface VisualMapSpec {
  type: 'piecewise'
  pieces: { min?: number; max?: number; label: string; color: string }[]
  unit?: string
}

/** 面积分档 */
const AREA_PIECES: VisualMapSpec['pieces'] = [
  { max: 1, label: '< 1 万km²', color: '#cdebc0' },
  { min: 1, max: 10, label: '1–10', color: '#9ad1a8' },
  { min: 10, max: 30, label: '10–30', color: '#63b68a' },
  { min: 30, max: 60, label: '30–60', color: '#3f9678' },
  { min: 60, max: 120, label: '60–120', color: '#2b7a68' },
  { min: 120, label: '> 120', color: '#1b5e58' },
]

export function buildVisualMap(datasetId: string): VisualMapSpec | null {
  switch (datasetId) {
    case 'area':
      return { type: 'piecewise', pieces: AREA_PIECES, unit: '万km²' }
    default:
      return null
  }
}

/** 依据数据集 + 区域名生成填充色（默认/彩虹/渐变三种纯配色模式用） */
export function colorForRegion(datasetId: string, name: string): string | null {
  const h = hashString(name)
  switch (datasetId) {
    case 'rainbow':
      return PALETTE[h % PALETTE.length]!
    case 'gradient': {
      const hue = 180 + (h % 120) // 青绿到蓝紫
      return `hsl(${hue}, 65%, 55%)`
    }
    default:
      return null
  }
}
