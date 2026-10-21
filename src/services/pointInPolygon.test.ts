import { describe, expect, it } from 'vitest'
import { pointInPolygon, findRegionAt } from './pointInPolygon'

// 简单正方形: (0,0)-(10,0)-(10,10)-(0,10)
const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]

describe('pointInPolygon', () => {
  it('内部点返回 true', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true)
  })

  it('外部点返回 false', () => {
    expect(pointInPolygon([15, 5], square)).toBe(false)
    expect(pointInPolygon([-1, -1], square)).toBe(false)
  })

  it('边界上的点视为内部', () => {
    expect(pointInPolygon([0, 5], square)).toBe(true)
    expect(pointInPolygon([10, 10], square)).toBe(true)
  })

  it('支持 MultiPolygon', () => {
    const multi = { type: 'MultiPolygon' as const, coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[100, 100], [101, 100], [101, 101], [100, 101], [100, 100]]],
    ] }
    expect(pointInPolygon([100.5, 100.5], multi)).toBe(true)
    expect(pointInPolygon([50, 50], multi)).toBe(false)
  })
})

describe('findRegionAt', () => {
  const geojson = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: { adcode: 110000, name: '北京市' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[100, 0], [110, 0], [110, 10], [100, 10], [100, 0]]],
        },
      },
      {
        type: 'Feature' as const,
        properties: { adcode: 120000, name: '天津市' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[200, 0], [210, 0], [210, 10], [200, 10], [200, 0]]],
        },
      },
    ],
  }

  it('返回点所在的 feature', () => {
    expect(findRegionAt(geojson, [105, 5])?.properties.name).toBe('北京市')
    expect(findRegionAt(geojson, [205, 5])?.properties.name).toBe('天津市')
  })

  it('不落在任何 feature 时返回 null', () => {
    expect(findRegionAt(geojson, [0, 0])).toBeNull()
  })
})
