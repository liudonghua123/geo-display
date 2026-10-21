import { describe, expect, it } from 'vitest'
import { useDrilldown } from './useDrilldown'
import type { RegionNode } from '../types'

describe('useDrilldown', () => {
  it('初始状态为全国', () => {
    const { path } = useDrilldown()
    expect(path.value).toEqual([{ adcode: 100000, name: '全国', level: 'country' }])
  })

  it('enter 追加节点', () => {
    const { path, enter } = useDrilldown()
    enter({ adcode: 330000, name: '浙江省', level: 'province' })
    expect(path.value).toHaveLength(2)
    expect(path.value[1]?.name).toBe('浙江省')
  })

  it('enter 同一 adcode 不重复追加', () => {
    const { path, enter } = useDrilldown()
    const node: RegionNode = { adcode: 330000, name: '浙江省', level: 'province' }
    enter(node)
    enter(node)
    expect(path.value).toHaveLength(2)
  })

  it('enter 时截断路径中已有的更深节点（跳转场景）', () => {
    const { path, enter } = useDrilldown()
    enter({ adcode: 330000, name: '浙江省', level: 'province' })
    enter({ adcode: 330100, name: '杭州市', level: 'city' })
    enter({ adcode: 330000, name: '浙江省', level: 'province' }) // 回到省
    expect(path.value).toHaveLength(2)
  })

  it('goTo 跳转到指定深度', () => {
    const { path, enter, goTo } = useDrilldown()
    enter({ adcode: 330000, name: '浙江省', level: 'province' })
    enter({ adcode: 330100, name: '杭州市', level: 'city' })
    goTo(1)
    expect(path.value).toHaveLength(2)
    expect(path.value[1]?.name).toBe('浙江省')
  })

  it('goTo(0) 回到全国', () => {
    const { path, enter, goTo } = useDrilldown()
    enter({ adcode: 330000, name: '浙江省', level: 'province' })
    goTo(0)
    expect(path.value).toHaveLength(1)
  })

  it('current 返回当前节点', () => {
    const { current, enter } = useDrilldown()
    expect(current.value.level).toBe('country')
    enter({ adcode: 330000, name: '浙江省', level: 'province' })
    expect(current.value.adcode).toBe(330000)
  })
})
