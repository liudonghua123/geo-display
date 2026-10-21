# 中国行政区划地图应用 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 纯前端中国省/市/区地理边界地图应用：全屏 ECharts 地图、逐级下钻、拼音搜索、地理定位高亮、深浅双主题、示例数据着色，响应式适配全端。

**Architecture:** Vue 3 + TS + Vite SPA。数据层抽象为 `GeoSource` 接口（本地 JSON 按需 fetch + 缓存）；GeoJSON 由构建前脚本抓取并简化打包。UI 采用悬浮控件式全屏地图。可扩展点：GeoSource（数据源）、主题（cssVars+echartsTheme 对）、DatasetProvider（着色数据集）。

**Tech Stack:** Vite、Vue 3 (`<script setup>` + TS)、ECharts 5、Vitest。构建期脚本用 `pinyin-pro` 生成搜索索引、`mapshaper` 简化边界。

**已验证的数据源事实**（抓取脚本会用到）：

- 模板：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`
- `100000_full.json` 返回 35 个 feature：34 省级行政区 + 1 个 adcode 为 `100000_JD` 的边界占位（须在脚本中**过滤掉无 name 的 feature**）
- 台湾省 `710000` 的 `childrenNum=0`，且 `710000_full.json` 不存在（404 NoSuchKey）→ **脚本必须容错 404**，港澳（810000/820000）的 `_full` 是区级直接下钻
- 湖北省有 4 个 `childrenNum=0` 的直管县级市（429004 等），其 `_full` 同样 404 → **下钻逻辑必须以 `childrenNum` 判断叶子节点，不能靠层级**
- 海南省 460000 下含地级市（含三沙市 460300，有数据）

**设计文档:** `docs/superpowers/specs/2026-10-21-china-geo-map-design.md`

---

## 文件结构总览

```
geo-display/
├── public/geo/                  # [脚本生成] geojson + search-index.json + manifest.json
├── scripts/
│   └── fetch-geo.mjs            # 数据抓取/简化/索引生成
├── src/
│   ├── types/index.ts           # 全部共享类型
│   ├── services/
│   │   ├── geoSource.ts         # GeoSource 接口 + LocalGeoSource
│   │   ├── searchIndex.ts       # 搜索索引加载与查询
│   │   └── pointInPolygon.ts    # 射线法
│   ├── composables/
│   │   ├── useDrilldown.ts      # 下钻状态机
│   │   ├── useSearch.ts         # 搜索逻辑
│   │   ├── useLocator.ts        # 定位 + 点面判断
│   │   └── useTheme.ts          # 主题状态
│   ├── themes/dark.ts, light.ts, index.ts
│   ├── datasets/providers.ts    # DatasetProvider 实现
│   ├── components/
│   │   ├── MapView.vue          # ECharts 容器
│   │   ├── SearchBox.vue
│   │   ├── Breadcrumb.vue
│   │   ├── ControlBar.vue       # 主题/着色切换
│   │   ├── ActionButtons.vue    # 定位/回全国
│   │   └── LegendPanel.vue
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `src/types/index.ts`, `.gitignore`

- [ ] **Step 1: 初始化项目文件**

`package.json`:

```json
{
  "name": "geo-display",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "fetch-geo": "node scripts/fetch-geo.mjs",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "echarts": "^5.5.1",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "mapshaper": "^0.6.102",
    "pinyin-pro": "^3.26.0",
    "typescript": "~5.6.3",
    "vite": "^6.0.5",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.1.10"
  }
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>中国行政区划地图</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/types/index.ts`:

```ts
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
  /** 祖先名称链，用于下拉展示上下文，如 ["浙江省"] */
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
```

`src/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

`src/App.vue`（临时占位，后续 Task 替换）:

```vue
<template>
  <div class="placeholder">应用搭建中…</div>
</template>

<style scoped>
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 14px;
  color: #888;
}
</style>
```

`.gitignore`:

```
node_modules
dist
public/geo
*.local
```

- [ ] **Step 2: 安装依赖并验证**

Run: `npm install`
Expected: 无 error（warning 可忽略）

Run: `npm run test`
Expected: `No test files found` 之类提示，exit code 1 是正常的（还没有测试）

Run: `npx vite build 2>&1 | tail -3`
Expected: `✓ built in ...`，说明脚手架可用

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: Vite + Vue3 + TS 项目脚手架"
```

---

### Task 2: GeoJSON 抓取脚本

**Files:**
- Create: `scripts/fetch-geo.mjs`

- [ ] **Step 1: 编写抓取脚本**

脚本职责：抓取全国 34 省级 → 各省市级 → 各市区级 GeoJSON；mapshaper 简化（默认保留 15% 坐标点）；生成搜索索引 `search-index.json`；生成 `manifest.json` 记录文件清单。容错：404 的 `_full`（台湾省、湖北直管县级市等）跳过并记录。

`scripts/fetch-geo.mjs`:

```js
#!/usr/bin/env node
/**
 * 抓取阿里云 DataV GeoAtlas 行政区划边界数据，简化后写入 public/geo/。
 * 同时生成搜索索引 search-index.json 与清单 manifest.json。
 *
 * 用法: npm run fetch-geo [-- --keep-full]
 *   --keep-full  跳过 mapshaper 简化（调试用）
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'geo')
const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound'
const SIMPLIFY_PCT = process.argv.includes('--keep-full') ? 1 : 0.15

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null // 该行政区无下钻数据（台湾省、直管县级市等）
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (i === retries - 1) throw e
      await sleep(1000 * (i + 1))
    }
  }
}

/** mapshaper 简化 GeoJSON（经 stdin/stdout 调用 CLI，保持拓扑） */
async function simplify(geojson) {
  if (SIMPLIFY_PCT >= 1) return geojson
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)
  const input = JSON.stringify(geojson)
  const { stdout } = await run('npx', [
    'mapshaper', '-' /* stdin */,
    `-simplify ${SIMPLIFY_PCT}% keep-shapes`,
    '-clean',
    '-o format=geojson -' /* stdout */,
  ], { input, maxBuffer: 512 * 1024 * 1024, shell: process.platform === 'win32' })
  return JSON.parse(stdout)
}

/** "浙江省"→"浙江"，"内蒙古自治区"→"内蒙古"，"香港特别行政区"→"香港" */
function shortName(name) {
  return name
    .replace(/(省|市|特别行政区)$/, '')
    .replace(/^(黑龙江|内蒙古|广西|西藏|宁夏|新疆)(维吾尔|壮族|回族|自治区|)/, '$1')
    .replace(/(自治区|自治州|地区|盟|林区)$/, '')
    .replace(/市$/, '')
}

function toMeta(feature, level, parentAdcode, parentName) {
  const { adcode, name } = feature.properties
  const full = pinyin(name, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
  return {
    adcode,
    name,
    shortName: shortName(name),
    fullPinyin: full.join('').toLowerCase(),
    pinyinInitials: pinyin(name, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('').toLowerCase(),
    level,
    parentAdcode,
    path: parentName ? [parentName] : [],
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const index = []
  const manifest = { generatedAt: new Date().toISOString(), simplified: SIMPLIFY_PCT, files: {} }
  const skipped = []

  console.log('1/3 抓取省级数据…')
  const country = await fetchJson(`${BASE}/100000_full.json`)
  const provinces = country.features.filter((f) => f.properties.name) // 过滤 100000_JD 占位
  await writeFile(path.join(OUT_DIR, '100000_full.json'), JSON.stringify(country))

  console.log(`2/3 抓取 ${provinces.length} 个省的市级数据…`)
  const cityTasks = []
  for (const prov of provinces) {
    const p = prov.properties
    if (p.childrenNum === 0) { skipped.push(`${p.name}(无下钻)`); continue }
    cityTasks.push((async () => {
      const cities = await fetchJson(`${BASE}/${p.adcode}_full.json`)
      if (!cities) { skipped.push(`${p.name}(_full 404)`); return [] }
      await writeFile(path.join(OUT_DIR, `${p.adcode}_full.json`), JSON.stringify(cities))
      index.push(toMeta(prov, 'province', 100000, null))
      return cities.features.filter((f) => f.properties.name)
    })())
    await sleep(120) // 限速
  }
  const provinceCityPairs = await Promise.all(cityTasks)

  console.log('3/3 抓取区级数据…')
  let done = 0
  for (const cities of provinceCityPairs) {
    for (const city of cities) {
      const c = city.properties
      index.push(toMeta(city, 'city', c.parent?.adcode ?? 0,
        provinces.find((x) => x.properties.adcode === c.parent?.adcode)?.properties.name ?? ''))
      if (c.childrenNum === 0) continue
      const districts = await fetchJson(`${BASE}/${c.adcode}_full.json`)
      if (!districts) { skipped.push(`${c.name}(_full 404)`); continue }
      await writeFile(path.join(OUT_DIR, `${c.adcode}_full.json`), JSON.stringify(districts))
      for (const d of districts.features.filter((f) => f.properties.name)) {
        index.push(toMeta(d, 'district', c.adcode, c.name))
      }
    }
    done++
    if (done % 10 === 0) console.log(`  ${done}/${provinceCityPairs.length}`)
    await sleep(60)
  }

  // manifest：记录已写入的文件，运行时用于判断数据是否存在
  const { readdir } = await import('node:fs/promises')
  for (const f of await readdir(OUT_DIR)) manifest.files[f] = true

  await writeFile(path.join(OUT_DIR, 'search-index.json'),
    JSON.stringify(index.sort((a, b) => a.adcode - b.adcode)))
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`完成：${Object.keys(manifest.files).length - 2} 个 GeoJSON，${index.length} 条索引`)
  if (skipped.length) console.log(`跳过 ${skipped.length} 项：\n  ` + skipped.join('\n  '))
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 运行脚本抓取全部数据**

Run: `npm run fetch-geo`
Expected: 输出 `完成：约 370 个 GeoJSON，约 3200 条索引`；`跳过` 列表中包含 `台湾省(_full 404)` 和若干直管县级市。耗时约 3–5 分钟。

Run: `ls public/geo | wc -l` 和 `du -sh public/geo`
Expected: 文件数 370 左右；总体积在简化后 10–20MB 内

抽查一个简化后的文件仍合法：

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('public/geo/330100_full.json','utf8')); console.log(d.features.length, d.features[0].properties.name)"
```
Expected: `13 上城区`（数量与原始一致，名字正确）

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-geo.mjs .gitignore
git commit -m "feat: GeoJSON 数据抓取与搜索索引生成脚本"
```

（`public/geo` 已在 .gitignore 中，不入库；部署时另行构建。）

---

### Task 3: 点在多边形内判断（TDD）

**Files:**
- Create: `src/services/pointInPolygon.ts`
- Test: `src/services/pointInPolygon.test.ts`

- [ ] **Step 1: 写失败测试**

`src/services/pointInPolygon.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/services/pointInPolygon.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/services/pointInPolygon.ts`:

```ts
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
    if ((xi === x && yi === y) || (yj === yi && Math.min(xj, xi) <= x && x <= Math.max(xj, xi))) return true
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** 点是否在 Polygon/MultiPolygon 内（任一外环命中即 true；忽略内环/孔洞，行政区划数据基本无孔洞） */
export function pointInPolygon(pt: [number, number], geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.some((rings) => inRing(pt, rings[0] as Ring))
  }
  return geometry.coordinates.some((polygon) => inRing(pt, polygon[0] as Ring))
}

interface FeatureLike {
  properties: { adcode: number; name: string; [k: string]: unknown }
  geometry: Geometry | null
}

/** 在 FeatureCollection 中找出包含该点的 feature */
export function findRegionAt<T extends FeatureLike>(
  geojson: { features: T[] },
  pt: [number, number],
): T | null {
  for (const f of geojson.features) {
    if (f.geometry && pointInPolygon(pt, f.geometry)) return f
  }
  return null
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/services/pointInPolygon.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/pointInPolygon.ts src/services/pointInPolygon.test.ts
git commit -m "feat: 射线法点面判断（含 MultiPolygon 与边界情况）"
```

---

### Task 4: GeoSource 数据服务

**Files:**
- Create: `src/services/geoSource.ts`

- [ ] **Step 1: 实现 GeoSource**

`src/services/geoSource.ts`:

```ts
import type { Level, RegionMeta } from '../types'

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

export type { Level }
```

注意：`GeoJSON` 命名空间由 TS 内置 lib 提供（`lib: ["DOM"]` 中包含），若无则 `npm i -D @types/geojson` 并在 `tsconfig.json` 的 `types` 中加入。

- [ ] **Step 2: 手动验证类型通过**

Run: `npx vue-tsc --noEmit`
Expected: 无错误。若报 `Cannot find namespace 'GeoJSON'`，运行 `npm i -D @types/geojson` 后重试。

- [ ] **Step 3: Commit**

```bash
git add src/services/geoSource.ts
git commit -m "feat: GeoSource 数据服务（本地 JSON + 内存缓存）"
```

---

### Task 5: 搜索服务（TDD）

**Files:**
- Create: `src/services/searchIndex.ts`
- Test: `src/services/searchIndex.test.ts`

- [ ] **Step 1: 写失败测试**

`src/services/searchIndex.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { queryIndex } from './searchIndex'
import type { RegionMeta } from '../types'

const mock: RegionMeta[] = [
  { adcode: 330000, name: '浙江省', shortName: '浙江', fullPinyin: 'zhejiangsheng', pinyinInitials: 'zjs', level: 'province', parentAdcode: 100000, path: [] },
  { adcode: 330100, name: '杭州市', shortName: '杭州', fullPinyin: 'hangzhoushi', pinyinInitials: 'hzs', level: 'city', parentAdcode: 330000, path: ['浙江省'] },
  { adcode: 330102, name: '上城区', shortName: '上城', fullPinyin: 'shangchengqu', pinyinInitials: 'scq', level: 'district', parentAdcode: 330100, path: ['浙江省', '杭州市'] },
  { adcode: 110000, name: '北京市', shortName: '北京', fullPinyin: 'beijingshi', pinyinInitials: 'bjs', level: 'province', parentAdcode: 100000, path: [] },
]

describe('queryIndex', () => {
  it('按中文名匹配', () => {
    expect(queryIndex(mock, '浙江')).toHaveLength(1)
  })

  it('按简称匹配', () => {
    expect(queryIndex(mock, '杭')).toHaveLength(1)
  })

  it('按全拼匹配', () => {
    expect(queryIndex(mock, 'hangzhou')).toHaveLength(1)
  })

  it('按拼音首字母匹配（zjs→浙江省）', () => {
    expect(queryIndex(mock, 'zjs')[0]?.name).toBe('浙江省')
  })

  it('大小写不敏感', () => {
    expect(queryIndex(mock, 'HZ')).toHaveLength(1)
  })

  it('空查询返回空数组', () => {
    expect(queryIndex(mock, '')).toHaveLength(0)
    expect(queryIndex(mock, '  ')).toHaveLength(0)
  })

  it('结果按层级排序（省→市→区）', () => {
    const r = queryIndex(mock, 'z')
    expect(r[0]?.level).toBe('province')
  })

  it('无匹配返回空数组', () => {
    expect(queryIndex(mock, 'xyz')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/services/searchIndex.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/services/searchIndex.ts`:

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/services/searchIndex.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/searchIndex.ts src/services/searchIndex.test.ts
git commit -m "feat: 行政区划搜索查询（中文/简称/全拼/首字母）"
```

---

### Task 6: ECharts 主题系统

**Files:**
- Create: `src/themes/dark.ts`, `src/themes/light.ts`, `src/themes/index.ts`
- Modify: `index.html`

- [ ] **Step 1: 定义深色主题**

`src/themes/dark.ts`:

```ts
import type { ThemeDef } from '../types'

export const darkTheme: ThemeDef = {
  id: 'dark',
  name: '深色科技',
  cssVars: {
    '--bg': '#0b1626',
    '--surface': 'rgba(16, 34, 56, 0.88)',
    '--border': 'rgba(0, 200, 255, 0.25)',
    '--text': '#d8ecff',
    '--text-dim': '#7fa3c0',
    '--accent': '#00c8ff',
    '--hover': 'rgba(0, 200, 255, 0.15)',
    '--shadow': '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#d8ecff' },
    mapRegion: {
      itemStyle: {
        areaColor: 'rgba(40, 120, 200, 0.22)',
        borderColor: 'rgba(0, 200, 255, 0.9)',
        borderWidth: 1.2,
        shadowColor: 'rgba(0, 200, 255, 0.4)',
        shadowBlur: 8,
      },
      emphasis: {
        label: { color: '#ffffff' },
        itemStyle: {
          areaColor: 'rgba(0, 200, 255, 0.45)',
          borderColor: '#ffffff',
          shadowBlur: 16,
        },
      },
      select: {
        label: { color: '#ffffff' },
        itemStyle: { areaColor: 'rgba(0, 220, 180, 0.55)', borderColor: '#ffffff' },
      },
    },
  },
}
```

- [ ] **Step 2: 定义浅色主题**

`src/themes/light.ts`:

```ts
import type { ThemeDef } from '../types'

export const lightTheme: ThemeDef = {
  id: 'light',
  name: '清新浅色',
  cssVars: {
    '--bg': '#eef3ee',
    '--surface': 'rgba(255, 255, 255, 0.92)',
    '--border': 'rgba(100, 140, 100, 0.3)',
    '--text': '#2c3e50',
    '--text-dim': '#7a8a7a',
    '--accent': '#2e7d32',
    '--hover': 'rgba(46, 125, 50, 0.12)',
    '--shadow': '0 2px 12px rgba(0, 0, 0, 0.12)',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#2c3e50' },
    mapRegion: {
      itemStyle: {
        areaColor: '#dbe9c8',
        borderColor: '#8aa877',
        borderWidth: 1,
      },
      emphasis: {
        label: { color: '#1a2a1a' },
        itemStyle: { areaColor: '#a8d08d', borderColor: '#5a7a4a' },
      },
      select: {
        label: { color: '#1a2a1a' },
        itemStyle: { areaColor: '#f5d98a', borderColor: '#c4a55e' },
      },
    },
  },
}
```

- [ ] **Step 3: 主题注册表**

`src/themes/index.ts`:

```ts
import type { ThemeDef } from '../types'
import { darkTheme } from './dark'
import { lightTheme } from './light'

export const THEMES: ThemeDef[] = [darkTheme, lightTheme]

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
```

- [ ] **Step 4: index.html 挂载 CSS 变量机制**

`index.html` 的 `<head>` 中加入（防止主题切换时闪烁）：

```html
<style>
  :root { color-scheme: dark; }
  body { margin: 0; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/themes index.html
git commit -m "feat: 深浅双主题定义（CSS 变量 + ECharts 主题）"
```

---

### Task 7: useDrilldown 下钻状态机（TDD）

**Files:**
- Create: `src/composables/useDrilldown.ts`
- Test: `src/composables/useDrilldown.test.ts`

- [ ] **Step 1: 写失败测试**

`src/composables/useDrilldown.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/composables/useDrilldown.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/composables/useDrilldown.ts`:

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/composables/useDrilldown.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/useDrilldown.ts src/composables/useDrilldown.test.ts
git commit -m "feat: 下钻状态机（enter/goTo/面包屑跳转）"
```

---

### Task 8: useSearch 与 useLocator

**Files:**
- Create: `src/composables/useSearch.ts`, `src/composables/useLocator.ts`

- [ ] **Step 1: 实现 useSearch**

`src/composables/useSearch.ts`:

```ts
import { ref, shallowRef } from 'vue'
import type { RegionMeta } from '../types'
import { queryIndex } from '../services/searchIndex'
import { geoSource } from '../services/geoSource'

/** 搜索：加载索引 + 防抖查询 */
export function useSearch() {
  const index = shallowRef<RegionMeta[]>([])
  const query = ref('')
  const results = ref<RegionMeta[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function ensureIndex() {
    if (index.value.length === 0 && !loading.value) {
      loading.value = true
      try {
        index.value = await geoSource.getIndex()
      } finally {
        loading.value = false
      }
    }
  }

  function onInput(value: string) {
    query.value = value
    clearTimeout(timer)
    timer = setTimeout(() => {
      results.value = queryIndex(index.value, query.value).slice(0, 12)
    }, 150)
  }

  return { query, results, loading, ensureIndex, onInput }
}
```

- [ ] **Step 2: 实现 useLocator**

`src/composables/useLocator.ts`:

```ts
import { ref } from 'vue'
import { findRegionAt } from '../services/pointInPolygon'
import { geoSource, canDrillDown } from '../services/geoSource'
import type { RegionNode } from '../types'

export type LocateState = 'idle' | 'locating' | 'success' | 'denied' | 'failed'

/**
 * 地理定位：浏览器 Geolocation API（不引入 IP 定位）。
 * 成功后从当前层级逐级向下判断点所在区域，返回标记点与逐级命中的路径。
 */
export function useLocator() {
  const state = ref<LocateState>('idle')
  const position = ref<[number, number] | null>(null)

  async function locate(startAdcode: number): Promise<RegionNode[]> {
    state.value = 'locating'
    if (!('geolocation' in navigator)) {
      state.value = 'failed'
      return []
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
      for (let depth = 0; depth < 3; depth++) {
        const fc = await geoSource.getChildren(adcode)
        const hit = findRegionAt(fc, pt)
        if (!hit) break
        const props = hit.properties as { adcode: number; name: string; level: string; childrenNum: number }
        chain.push({ adcode: props.adcode, name: props.name, level: props.level as RegionNode['level'] })
        if (!canDrillDown(props.childrenNum)) break
        adcode = props.adcode
      }
      return chain
    } catch (e) {
      state.value = e instanceof GeolocationPositionError && e.code === e.PERMISSION_DENIED ? 'denied' : 'failed'
      return []
    }
  }

  return { state, position, locate }
}
```

- [ ] **Step 3: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/composables/useSearch.ts src/composables/useLocator.ts
git commit -m "feat: 搜索与地理定位 composables"
```

---

### Task 9: 着色数据集 providers（TDD）

**Files:**
- Create: `src/datasets/providers.ts`
- Test: `src/datasets/providers.test.ts`
- Create: `src/datasets/sample-data.ts`（示例数据：省级行政区面积，万平方公里）

- [ ] **Step 1: 写失败测试**

`src/datasets/providers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DATASETS, getDataset, buildVisualMap, PALETTE } from './providers'

describe('providers', () => {
  it('内置至少 4 个数据集（默认/彩虹/单色渐变/示例数据）', () => {
    expect(DATASETS.length).toBeGreaterThanOrEqual(4)
  })

  it('getDataset 按 id 查找，找不到返回第一个', () => {
    expect(getDataset('rainbow')?.id).toBe('rainbow')
    expect(getDataset('not-exist')?.id).toBe(DATASETS[0]!.id)
  })

  it('population 数据集返回省级数值映射', () => {
    const ds = getDataset('area')!
    const data = ds.getData('province')
    expect(data).not.toBeNull()
    expect(data![330000]).toBeGreaterThan(0) // 浙江
    expect(data![710000]).toBeGreaterThan(0) // 台湾
  })

  it('PALETTE 至少 6 色', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(6)
  })
})

describe('buildVisualMap', () => {
  it('数值数据集生成分档 visualMap', () => {
    const vm = buildVisualMap('area')
    expect(vm).not.toBeNull()
    expect(vm!.type).toBe('piecewise')
  })

  it('配色类数据集不生成 visualMap', () => {
    expect(buildVisualMap('rainbow')).toBeNull()
    expect(buildVisualMap('default')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/datasets/providers.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现示例数据**

`src/datasets/sample-data.ts`:

```ts
/** 省级行政区陆地面积（万平方公里），来源：民政部公开数据（约数） */
export const PROVINCE_AREA: Record<number, number> = {
  110000: 1.64, 120000: 1.20, 130000: 18.88, 140000: 15.67, 150000: 118.30,
  210000: 14.86, 220000: 18.74, 230000: 47.30, 310000: 0.63, 320000: 10.72,
  330000: 10.55, 340000: 14.01, 350000: 12.40, 360000: 16.69, 370000: 15.79,
  410000: 16.70, 420000: 18.59, 430000: 21.18, 440000: 17.97, 450000: 23.76,
  460000: 3.54, 500000: 8.24, 510000: 48.60, 520000: 17.62, 530000: 39.41,
  540000: 122.84, 610000: 20.56, 620000: 42.58, 630000: 72.23, 640000: 5.19,
  650000: 166.00, 710000: 3.60, 810000: 0.11, 820000: 0.003,
}
```

- [ ] **Step 4: 实现 providers**

`src/datasets/providers.ts`:

```ts
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
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/datasets/providers.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/datasets
git commit -m "feat: 着色数据集 providers（默认/彩虹/渐变/面积 choropleth）"
```

---

### Task 10: useTheme 主题切换

**Files:**
- Create: `src/composables/useTheme.ts`

- [ ] **Step 1: 实现**

`src/composables/useTheme.ts`:

```ts
import { ref, watchEffect } from 'vue'
import type { ThemeDef } from '../types'
import { getTheme } from '../themes'

const saved = localStorage.getItem('gd-theme')
const themeId = ref(saved ?? 'dark')

watchEffect(() => {
  const theme: ThemeDef = getTheme(themeId.value)
  for (const [k, v] of Object.entries(theme.cssVars)) {
    document.documentElement.style.setProperty(k, v)
  }
  localStorage.setItem('gd-theme', themeId.value)
})

export function useTheme() {
  function setTheme(id: string) {
    themeId.value = id
  }
  return { themeId, setTheme }
}
```

- [ ] **Step 2: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/composables/useTheme.ts
git commit -m "feat: 主题切换 composable（CSS 变量 + localStorage 持久化）"
```

---

### Task 11: MapView 地图组件

**Files:**
- Create: `src/components/MapView.vue`

- [ ] **Step 1: 实现地图渲染组件**

组件职责：持有 ECharts 实例；监听当前层级 adcode 与数据集/主题变化重渲染；转发 region 点击事件。颜色规则：数据集为数值型时用 visualMap 分档；纯配色时按 `colorForRegion` 或主题默认色。

`src/components/MapView.vue`:

```vue
<template>
  <div ref="containerRef" class="map-view" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { geoSource, canDrillDown } from '../services/geoSource'
import { getTheme } from '../themes'
import { getDataset, buildVisualMap, colorForRegion, PALETTE } from '../datasets/providers'
import type { RegionNode } from '../types'

const props = defineProps<{
  currentAdcode: number
  currentLevel: RegionNode['level']
  themeId: string
  datasetId: string
}>()

const emit = defineEmits<{
  regionClick: [node: RegionNode]
}>()

const containerRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let renderSeq = 0

function regionColor(name: string, index: number): string {
  if (props.datasetId === 'default') {
    return PALETTE[index % PALETTE.length]
  }
  return colorForRegion(props.datasetId, name) ?? PALETTE[index % PALETTE.length]!
}

async function render() {
  if (!chart) return
  const seq = ++renderSeq
  const adcode = props.currentAdcode

  let fc: GeoJSON.FeatureCollection
  try {
    fc = await geoSource.getChildren(adcode)
  } catch {
    // 数据缺失（如台湾省）：静默保持当前视图
    return
  }
  if (seq !== renderSeq) return // 已过期

  const theme = getTheme(props.themeId)
  const features = fc.features.filter((f) => f.properties.name)
  const ds = getDataset(props.datasetId)
  const values = ds.getData(props.currentLevel === 'country' ? 'province' : props.currentLevel) as Record<number, number> | null

  const seriesData = features.map((f, i) => {
    const p = f.properties as { adcode: number; name: string; childrenNum: number }
    return {
      name: p.name,
      adcode: p.adcode,
      childrenNum: p.childrenNum,
      value: values?.[p.adcode] ?? undefined,
      itemStyle: values ? undefined : { areaColor: regionColor(p.name, i) },
    }
  })

  const visualMap = values ? buildVisualMap(props.datasetId) : null

  chart.setOption(
    {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: { name: string; value?: number }) => {
          const unit = visualMap?.unit ?? ''
          return params.value != null
            ? `${params.name}<br/>${ds.legend.label}: ${params.value}${unit}`
            : params.name
        },
      },
      visualMap: visualMap
        ? {
            type: 'piecewise',
            left: 'left',
            bottom: 'bottom',
            pieces: visualMap.pieces,
            textStyle: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#ccc' },
          }
        : undefined,
      series: [
        {
          type: 'map',
          map: String(adcode),
          roam: true,
          selectedMode: 'single',
          label: { show: true, fontSize: 11 },
          data: seriesData,
          ...(theme.echarts.mapRegion as Record<string, unknown>),
        },
      ],
    },
    { notMerge: true },
  )
}

async function registerMap() {
  const adcode = props.currentAdcode
  const fc = await geoSource.getChildren(adcode)
  echarts.registerMap(String(adcode), fc as Parameters<typeof echarts.registerMap>[1])
}

onMounted(async () => {
  if (!containerRef.value) return
  chart = echarts.init(containerRef.value)
  chart.on('click', (params: { name?: string; data?: { adcode: number; childrenNum: number } }) => {
    const d = params.data
    if (d) emit('regionClick', { adcode: d.adcode, name: params.name ?? '', level: props.currentLevel })
  })
  await registerMap()
  render()

  window.addEventListener('resize', handleResize)
})

function handleResize() {
  chart?.resize()
}

watch(
  () => [props.currentAdcode, props.themeId, props.datasetId],
  async () => {
    await registerMap()
    render()
  },
)

watch(
  () => props.themeId,
  () => {
    // 主题变更仅重渲染配色，无需重新注册地图
    render()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.map-view {
  position: absolute;
  inset: 0;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无错误（若 `GeoJSON` 命名空间缺失，`npm i -D @types/geojson`）

- [ ] **Step 3: 手动冒烟验证**

Run: `npm run dev`，浏览器打开，把 App.vue 临时改为：

```vue
<template>
  <div style="position: relative; width: 100vw; height: 100vh">
    <MapView :current-adcode="100000" current-level="country" theme-id="dark" dataset-id="default"
      @region-click="(n) => console.log(n)" />
  </div>
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>
```

Expected: 显示全国地图，可缩放平移，hover 有 tooltip，点击省份控制台输出 adcode

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.vue
git commit -m "feat: ECharts 地图渲染组件（roam/tooltip/点击下钻/着色）"
```

---

### Task 12: 悬浮控件组件（SearchBox / Breadcrumb / ControlBar / ActionButtons / LegendPanel）

**Files:**
- Create: `src/components/SearchBox.vue`, `src/components/Breadcrumb.vue`, `src/components/ControlBar.vue`, `src/components/ActionButtons.vue`, `src/components/LegendPanel.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: SearchBox**

`src/components/SearchBox.vue`:

```vue
<template>
  <div class="search-box" :class="{ open: !!results.length }">
    <input
      class="search-input"
      type="text"
      :value="query"
      placeholder="搜索省 / 市 / 区县 / 拼音 / 首字母…"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.esc="clear"
    />
    <ul v-if="results.length && focused" class="results">
      <li v-for="r in results" :key="r.adcode" @mousedown.prevent="select(r)">
        <span class="name">{{ r.name }}</span>
        <span class="path">{{ r.path.join(' › ') }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSearch } from '../composables/useSearch'
import type { RegionMeta } from '../types'

const emit = defineEmits<{ select: [meta: RegionMeta] }>()

const { query, results, ensureIndex, onInput } = useSearch()
const focused = ref(false)

onMounted(() => void ensureIndex())

function select(r: RegionMeta) {
  emit('select', r)
  clear()
}

function clear() {
  onInput('')
  results.value = []
}
</script>

<style scoped>
.search-box { position: relative; }
.search-input {
  width: 260px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  outline: none;
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}
.search-input:focus { border-color: var(--accent); }
.results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  max-height: 320px;
  overflow-y: auto;
  z-index: 20;
}
.results li {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--text);
}
.results li:hover { background: var(--hover); }
.results .path { color: var(--text-dim); font-size: 11px; white-space: nowrap; }

@media (max-width: 767px) {
  .search-input { width: 100%; }
}
</style>
```

- [ ] **Step 2: Breadcrumb**

`src/components/Breadcrumb.vue`:

```vue
<template>
  <nav class="breadcrumb">
    <template v-for="(node, i) in path" :key="node.adcode">
      <span v-if="i > 0" class="sep">›</span>
      <button class="crumb" :class="{ active: i === path.length - 1 }" @click="$emit('goTo', i)">
        {{ node.name }}
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { RegionNode } from '../types'

defineProps<{ path: RegionNode[] }>()
defineEmits<{ goTo: [depth: number] }>()
</script>

<style scoped>
.breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  font-size: 12px;
}
.crumb {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
}
.crumb.active { color: var(--text); cursor: default; }
.sep { color: var(--text-dim); }
</style>
```

- [ ] **Step 3: ControlBar（主题 + 着色切换）**

`src/components/ControlBar.vue`:

```vue
<template>
  <div class="control-bar">
    <select class="control-select" :value="themeId" aria-label="主题" @change="$emit('update:themeId', ($event.target as HTMLSelectElement).value)">
      <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
    <select class="control-select" :value="datasetId" aria-label="着色模式" @change="$emit('update:datasetId', ($event.target as HTMLSelectElement).value)">
      <option v-for="d in datasets" :key="d.id" :value="d.id">{{ d.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { THEMES } from '../themes'
import { DATASETS } from '../datasets/providers'

defineProps<{ themeId: string; datasetId: string }>()
defineEmits<{ 'update:themeId': [v: string]; 'update:datasetId': [v: string] }>()
</script>

<style scoped>
.control-bar { display: flex; gap: 8px; }
.control-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  outline: none;
  box-shadow: var(--shadow);
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: ActionButtons（定位 + 回全国）**

`src/components/ActionButtons.vue`:

```vue
<template>
  <div class="action-buttons">
    <button class="action-btn" title="回到全国视图" :disabled="atRoot" @click="$emit('home')">⌂</button>
    <button class="action-btn" title="定位当前位置" :disabled="locating" @click="$emit('locate')">
      {{ locating ? '…' : '📍' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ atRoot: boolean; locating: boolean }>()
defineEmits<{ home: []; locate: [] }>()
</script>

<style scoped>
.action-buttons { display: flex; flex-direction: column; gap: 8px; }
.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 17px;
  cursor: pointer;
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}
.action-btn:hover:not(:disabled) { border-color: var(--accent); }
.action-btn:disabled { opacity: 0.45; cursor: default; }
</style>
```

- [ ] **Step 5: LegendPanel（数值数据集图例；纯配色时隐藏）**

`src/components/LegendPanel.vue`:

```vue
<template>
  <div v-if="vm" class="legend-panel">
    <div class="legend-title">{{ title }}</div>
    <div v-for="p in vm.pieces" :key="p.label" class="legend-item">
      <span class="swatch" :style="{ background: p.color }" />
      <span>{{ p.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDataset, buildVisualMap } from '../datasets/providers'

const props = defineProps<{ datasetId: string }>()

const vm = computed(() => buildVisualMap(props.datasetId))
const title = computed(() => {
  const ds = getDataset(props.datasetId)
  return ds.legend.unit ? `${ds.legend.label}（${ds.legend.unit}）` : ds.legend.label
})
</script>

<style scoped>
.legend-panel {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  font-size: 12px;
  color: var(--text);
}
.legend-title { font-weight: 600; margin-bottom: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.swatch { width: 14px; height: 10px; border-radius: 2px; }
</style>
```

- [ ] **Step 6: 组装 App.vue（悬浮控件式布局 + 响应式 + 状态编排）**

`src/App.vue` 全量替换：

```vue
<template>
  <div class="app">
    <MapView
      :current-adcode="current.adcode"
      :current-level="current.level"
      :theme-id="themeId"
      :dataset-id="datasetId"
      @region-click="onRegionClick"
    />

    <header class="top-bar">
      <div class="top-left">
        <SearchBox @select="onSearchSelect" />
        <Breadcrumb :path="path" @go-to="goTo" />
      </div>
      <h1 class="title">中国行政区划地图</h1>
      <ControlBar v-model:theme-id="themeId" v-model:dataset-id="datasetId" />
    </header>

    <div class="bottom-left">
      <LegendPanel :dataset-id="datasetId" />
    </div>
    <div class="bottom-right">
      <ActionButtons :at-root="current.level === 'country'" :locating="locateState === 'locating'"
        @home="goTo(0)" @locate="onLocate" />
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MapView from './components/MapView.vue'
import SearchBox from './components/SearchBox.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import ControlBar from './components/ControlBar.vue'
import ActionButtons from './components/ActionButtons.vue'
import LegendPanel from './components/LegendPanel.vue'
import { useDrilldown } from './composables/useDrilldown'
import { useTheme } from './composables/useTheme'
import { useLocator } from './composables/useLocator'
import { geoSource } from './services/geoSource'
import type { RegionMeta, RegionNode } from './types'

const { path, current, enter, goTo } = useDrilldown()
const { themeId } = useTheme()
const datasetId = ref('default')
const { state: locateState, position, locate } = useLocator()
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2500)
}

/** 点击区域下钻（叶子节点不下钻） */
async function onRegionClick(node: RegionNode) {
  const fc = await geoSource.getChildren(current.value.adcode)
  const hit = fc.features.find(
    (f) => (f.properties as { adcode: number }).adcode === node.adcode,
  )
  const childrenNum = (hit?.properties as { childrenNum?: number } | undefined)?.childrenNum ?? 0
  if (childrenNum === 0) {
    showToast(`${node.name} 无下级区划数据`)
    return
  }
  enter(node)
}

/** 搜索选中：重建路径（全国 → … → 目标），MapView 通过 adcode 变化自动渲染 */
async function onSearchSelect(meta: RegionMeta) {
  const chain: RegionNode[] = []
  // path 字段只存了直接父级名，从索引 adcode 逐级向上找父 adcode
  const idx = await geoSource.getIndex()
  const byAdcode = new Map(idx.map((r) => [r.adcode, r]))
  let cur: RegionMeta | undefined = meta
  while (cur) {
    chain.unshift({ adcode: cur.adcode, name: cur.name, level: cur.level })
    cur = cur.parentAdcode && cur.parentAdcode !== 100000
      ? byAdcode.get(cur.parentAdcode)
      : undefined
  }
  // 先跳回全国，再沿链逐级 enter，保证路径完整
  goTo(0)
  for (const node of chain) enter(node)
}

async function onLocate() {
  const chain = await locate(current.value.adcode)
  if (locateState.value === 'denied') return showToast('定位权限被拒绝，请在浏览器中允许定位')
  if (locateState.value === 'failed') return showToast('定位失败，请重试')
  if (!chain.length) return showToast('无法确定所在区域')
  goTo(0)
  for (const node of chain) enter(node)
  showToast(`当前位于：${chain.map((n) => n.name).join(' › ')}`)
}

onMounted(() => {
  if (!('geolocation' in navigator)) showToast('当前浏览器不支持定位')
})
</script>

<style>
:root {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  z-index: 10;
  pointer-events: none;
}
.top-bar > * { pointer-events: auto; }
.top-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.title {
  margin: 6px 0 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text);
  text-shadow: 0 0 12px var(--accent);
}
.bottom-left {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 10;
}
.bottom-right {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 10;
}
.toast {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
  font-size: 13px;
  z-index: 30;
}

/* 平板 */
@media (max-width: 1023px) {
  .title { display: none; }
}
/* 手机 */
@media (max-width: 767px) {
  .top-bar { padding: 10px 12px; }
  .top-left { width: 100%; }
  .top-left :first-child { width: 100%; }
  .top-bar { flex-wrap: wrap; }
  .action-btn { width: 34px; height: 34px; font-size: 14px; }
}
</style>
```

- [ ] **Step 7: 手动全功能验证**

Run: `npm run dev`

逐项验证：
1. 全国地图渲染，可缩放/平移
2. 点击浙江省 → 进入浙江市级地图，面包屑变为 `全国 › 浙江省`
3. 点击杭州市 → 区级地图；面包屑点"浙江省" → 跳回
4. 右下 ⌂ → 回全国
5. 搜索 `zj` → 下拉出现"浙江省"，选中 → 飞到浙江
6. 搜索 `杭州` → 选中 → 进入杭州市
7. 切浅色主题 → 全局配色变化，刷新后保持
8. 着色模式切"彩虹" → 各省不同色；切"省域面积" → 分档着色 + 左下图例
9. 点 📍 → 允许授权后定位标记并逐级下钻高亮；拒绝授权 → toast 提示
10. 浏览器窗口缩到手机宽度 → 控件单列、标题隐藏

- [ ] **Step 8: Commit**

```bash
git add src/components src/App.vue
git commit -m "feat: 悬浮控件 UI（搜索/面包屑/主题/着色/定位/图例）与响应式布局"
```

---

### Task 13: 定位点标记（effectScatter）收尾

**Files:**
- Modify: `src/components/MapView.vue`

- [ ] **Step 1: MapView 增加定位点 overlay**

在 `src/components/MapView.vue` 中：

props 增加：

```ts
const props = defineProps<{
  currentAdcode: number
  currentLevel: RegionNode['level']
  themeId: string
  datasetId: string
  locatePoint?: [number, number] | null
}>()
```

`render()` 中 series 改为数组末尾追加：

```ts
      series: [
        { /* 原有 map series… */ },
        ...(props.locatePoint
          ? [{
              type: 'effectScatter' as const,
              coordinateSystem: 'geo' as const,
              zlevel: 2,
              symbolSize: 10,
              rippleEffect: { scale: 3 },
              itemStyle: { color: '#ff4d4f' },
              data: [{ value: props.locatePoint, name: '当前位置' }],
            }]
          : []),
      ],
```

同时 series[0] 需要改为 `geo` + `series-map` 结构才能让 effectScatter 生效。具体：`setOption` 增加 `geo: { map: String(adcode), roam: true, ...theme.echarts.mapRegion }`，map series 改为 `{ type: 'map', map: String(adcode), geoIndex: 0, roam: false, label: …, data: seriesData }`（map series 复用 geo 的坐标系；roam 交给 geo）。

watch 数组加入 `props.locatePoint`：

```ts
watch(
  () => [props.currentAdcode, props.themeId, props.datasetId, props.locatePoint],
  async () => {
    await registerMap()
    render()
  },
)
```

- [ ] **Step 2: App.vue 传入定位点**

`src/App.vue` 中 MapView 增加 prop：

```html
    <MapView
      :current-adcode="current.adcode"
      :current-level="current.level"
      :theme-id="themeId"
      :dataset-id="datasetId"
      :locate-point="position"
      @region-click="onRegionClick"
    />
```

（`position` 已由 `useLocator` 返回，直接绑定即可。）

- [ ] **Step 3: 手动验证**

Run: `npm run dev` → 点 📍 定位成功后地图出现红色涟漪标记

- [ ] **Step 4: 类型检查 + 全量测试**

Run: `npx vue-tsc --noEmit && npm run test`
Expected: 类型无错误，全部测试 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/MapView.vue src/App.vue
git commit -m "feat: 定位点涟漪标记（geo + effectScatter）"
```

---

### Task 14: 构建验证与 README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 生产构建验证**

Run: `npm run build`
Expected: 构建成功；`dist/` 产物中包含 `geo/` 目录

Run: `npm run preview` → 浏览器验证一遍 Task 12 Step 7 的清单（preview 服务器上功能一致，特别是 fetch 相对路径正常）

- [ ] **Step 2: 写 README**

`README.md`:

```markdown
# 中国行政区划地图（geo-display）

纯前端的中国省 / 市 / 区县地理边界地图应用。全屏 ECharts 地图、逐级下钻、
拼音搜索（中文名 / 简称 / 全拼 / 首字母）、浏览器地理定位高亮、深浅双主题、
着色模式（默认 / 彩虹 / 渐变 / 省域面积 choropleth）。响应式适配手机 / 平板 / 桌面，
全部数据本地打包，部署后完全离线可用。

## 快速开始

```bash
npm install
npm run fetch-geo   # 首次运行：抓取并简化 GeoJSON 数据（约 3-5 分钟）
npm run dev         # 开发
```

## 部署

```bash
npm run build       # 产出 dist/
```

把 `dist/` 部署到任意静态服务器即可（数据在 `dist/geo/`）。

## 数据说明

- 数据源：阿里云 DataV GeoAtlas（`geo.datav.aliyun.com`），脚本已做 15% 简化
- 更新数据：重跑 `npm run fetch-geo`
- 台湾省与部分省直辖县级市无下钻数据（源数据限制），界面上点击仅提示

## 技术栈

Vite · Vue 3 · TypeScript · ECharts 5 · Vitest

## 架构

- `src/services/geoSource.ts` — GeoSource 接口（数据源可替换）
- `src/datasets/providers.ts` — DatasetProvider 接口（着色数据可扩展）
- `src/themes/` — 主题对（CSS 变量 + ECharts 主题），新增主题只需注册一组
- `scripts/fetch-geo.mjs` — 数据抓取 / 简化 / 搜索索引生成
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README（快速开始/部署/数据说明/扩展点）"
```

---

## 任务依赖

```
Task 1 → Task 2 → {Task 3..10 可并行}
Task 11 依赖 1,2,4,6,9
Task 12 依赖 7,8,10,11
Task 13 依赖 12
Task 14 依赖 13
```

## 自查记录

- 规格覆盖：下钻(T7,11)、搜索(T5,8,12)、定位(T8,13)、主题(T6,10)、着色(T9,11)、响应式(T12)、数据脚本(T2)、扩展点接口(T4,6,9) — 均有对应任务
- `canDrillDown` 基于 childrenNum（数据源验证：台湾省 level=province 但 childrenNum=0 且 404）
- 数据源 404 容错在 T2（脚本）与 T4（运行时 throw → T11 静默）双保险
