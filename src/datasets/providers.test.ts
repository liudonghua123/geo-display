import { describe, expect, it } from 'vitest'
import { DATASETS, getDataset, buildVisualMap, colorForRegion, PALETTE } from './providers'

describe('providers', () => {
  it('内置至少 4 个数据集（默认/彩虹/单色渐变/示例数据）', () => {
    expect(DATASETS.length).toBeGreaterThanOrEqual(4)
  })

  it('getDataset 按 id 查找，找不到返回第一个', () => {
    expect(getDataset('rainbow')?.id).toBe('rainbow')
    expect(getDataset('not-exist')?.id).toBe(DATASETS[0]!.id)
  })

  it('area 数据集返回省级数值映射', () => {
    const ds = getDataset('area')!
    const data = ds.getData('province')
    expect(data).not.toBeNull()
    expect(data![330000]).toBeGreaterThan(0) // 浙江
    expect(data![710000]).toBeGreaterThan(0) // 台湾
  })

  it('area 数据集非省级返回 null', () => {
    expect(getDataset('area')!.getData('city')).toBeNull()
    expect(getDataset('area')!.getData('district')).toBeNull()
  })

  it('PALETTE 至少 6 色', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(6)
  })

  it('colorForRegion 彩虹模式返回调色板颜色', () => {
    expect(colorForRegion('rainbow', '浙江省')).toMatch(/^#/)
  })

  it('colorForRegion 默认模式返回 null', () => {
    expect(colorForRegion('default', '浙江省')).toBeNull()
  })
})

describe('buildVisualMap', () => {
  it('数值数据集生成分档 visualMap', () => {
    const vm = buildVisualMap('area')
    expect(vm).not.toBeNull()
    expect(vm!.type).toBe('piecewise')
    expect(vm!.pieces.length).toBeGreaterThan(2)
  })

  it('配色类数据集不生成 visualMap', () => {
    expect(buildVisualMap('rainbow')).toBeNull()
    expect(buildVisualMap('default')).toBeNull()
  })
})
