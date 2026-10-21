import { ref } from 'vue'
import type { RegionNode } from '../types'

const ROOT: RegionNode = { adcode: 100000, name: '全国', level: 'country' }

/** 下钻路径状态机：全国 → 省 → 市 → 区县 */
export function useDrilldown() {
  const path = ref<RegionNode[]>([ROOT])

  const current = ref<RegionNode>(ROOT)

  function syncCurrent() {
    current.value = path.value[path.value.length - 1]!
  }

  /** 进入下级；若目标已在路径中则截断到该级（面包屑跳转复用） */
  function enter(node: RegionNode) {
    const idx = path.value.findIndex((n) => n.adcode === node.adcode)
    if (idx >= 0) {
      path.value = path.value.slice(0, idx + 1)
    } else {
      path.value = [...path.value, node]
    }
    syncCurrent()
  }

  /** 跳转到路径中的某一级（0 = 全国） */
  function goTo(depth: number) {
    path.value = path.value.slice(0, depth + 1)
    syncCurrent()
  }

  return { path, current, enter, goTo }
}
