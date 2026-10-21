type Ring = [number, number][]

interface Geometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

/** 射线法：点是否在单个环内（含边界） */
function inRing(pt: [number, number], ring: Ring): boolean {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    // 顶点/边上的点
    if ((xi === x && yi === y) || (yj === yi && yi === y && Math.min(xj, xi) <= x && x <= Math.max(xj, xi))) return true
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * 点是否在 Polygon/MultiPolygon/单个环内。
 * 任一外环命中即 true；忽略内环/孔洞（行政区划数据基本无孔洞）。
 */
export function pointInPolygon(pt: [number, number], geometry: Ring | Geometry): boolean {
  // 直接传入单个环（如简化测试或外部调用方只有环坐标）
  if (!('type' in geometry)) return inRing(pt, geometry)
  if (geometry.type === 'Polygon') {
    return inRing(pt, geometry.coordinates[0] as Ring)
  }
  return geometry.coordinates.some((polygon) => inRing(pt, polygon[0] as Ring))
}

interface FeatureLike {
  properties: { adcode: number; name: string; [k: string]: unknown }
  geometry: Geometry | null
}

// 已知局限：点恰好在两个区域的非水平共享边界上时，两侧都返回 false → findRegionAt 返回 null，调用方按"无法定位"降级处理即可。

/**
 * 在 FeatureCollection 中找出包含该点的 feature
 */
export function findRegionAt<T extends FeatureLike>(
  geojson: { features: T[] },
  pt: [number, number],
): T | null {
  for (const f of geojson.features) {
    if (f.geometry && pointInPolygon(pt, f.geometry)) return f
  }
  return null
}
