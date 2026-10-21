import type { RegionMeta } from '../types'

const LEVEL_ORDER = { province: 0, city: 1, district: 2 } as const

/**
 * 查询行政区划索引。匹配策略（任一命中即返回）：
 * 1. name / shortName 包含查询词（中文场景）
 * 2. fullPinyin 以查询词开头（全拼前缀）
 * 3. pinyinInitials 以查询词开头（首字母前缀）
 * 查询词先转小写、去空白。结果按 层级→adcode 排序。
 */
export function queryIndex(index: RegionMeta[], query: string): RegionMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index
    .filter((r) =>
      r.name.includes(q) ||
      r.shortName.includes(q) ||
      r.fullPinyin.startsWith(q) ||
      r.pinyinInitials.startsWith(q),
    )
    .sort((a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.adcode - b.adcode,
    )
}
