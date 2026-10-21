# 中国行政区划地图应用 — 设计文档

日期：2026-10-21
状态：已确认

## 1. 概述

纯前端的展示中国省、市、区地理边界的地图应用。面向大众的地图浏览工具：全屏沉浸式地图、逐级下钻、搜索（含拼音/简称）、地理定位高亮、深浅双主题、示例数据着色。响应式覆盖手机/平板/桌面。构建产物为静态文件，可部署到任意静态服务器，完全离线可用。

## 2. 技术栈

- **构建**：Vite
- **框架**：Vue 3（Composition API + `<script setup>`）+ TypeScript
- **地图渲染**：ECharts 5（`registerMap` + map series / geo 组件）
- **状态管理**：轻量 composables（`useMap`、`useSearch`、`useTheme`、`useDrilldown`），不引入 Pinia
- **测试**：Vitest（核心逻辑单元测试）
- **无其他运行时依赖**（拼音搜索自行实现小型转换表，不引大型拼音库）

## 3. 数据层

### 3.1 数据来源

阿里云 DataV GeoAtlas：

- 全国省级：`https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`
- 市级：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`（adcode 为省级行政区划代码）
- 区县级：同上，adcode 为市级代码

### 3.2 数据获取与打包

- `scripts/fetch-geo.mjs`：构建前运行的一次性脚本，抓取全国 34 省级 + 各省市级 + 各市区级 GeoJSON，写入 `public/geo/`。与运行时代码完全分离；数据更新只需重跑该脚本。
- 全部数据本地打包（预计 5–15MB），**离线可用**，无运行时外部依赖。
- 运行时通过 `fetch('/geo/...')` 按需加载，内存缓存（Map keyed by adcode）。

### 3.3 数据适配层（可扩展点）

```
interface GeoSource {
  getRegions(level: Level): Promise<RegionMeta[]>   // 元数据列表
  getGeoJSON(adcode: string): Promise<GeoJSON>       // 边界数据（带缓存）
}
```

默认实现 `LocalGeoSource`（本地 public/geo）。后续可替换为远程/自定义数据源。

## 4. 核心功能

### 4.1 逐级下钻

- 层级链：全国 → 省 → 市 → 区县
- 点击区域 → 加载该区域子级 GeoJSON → ECharts 缩放过渡动画
- 面包屑导航：`全国 › 浙江省 › 杭州市 › 西湖区`，点击任意一级跳回
- 右下角"回到全国"按钮
- 叶子节点（无子级数据）点击仅高亮，不再下钻

### 4.2 搜索

- 输入支持：中文全名（`浙江`）、简称/别称（`浙`、`杭州`）、全拼（`zhejiang`）、拼音首字母（`zj`）
- 索引构建：`scripts/fetch-geo.mjs` 抓取数据时同步生成静态索引 JSON（adcode、名称、简称、全拼、首字母、层级、父级），打包进应用
- 交互：输入即时过滤（防抖）、下拉展示匹配项（名称 + 层级 + 父级路径）、选中后地图飞行定位并高亮
- 大小写不敏感，支持模糊前缀匹配

### 4.3 地理定位

- 浏览器 `Geolocation API` 获取经纬度；失败/拒绝授权时 toast 提示降级（不引入 IP 定位，避免外部依赖）
- 定位成功：
  - 地图上以 `effectScatter` 标记定位点
  - 通过射线法（ray casting）点在多边形内判断，从当前地图数据逐级计算所在省/市/区
  - 自动下钻到最精确可判定层级并高亮该区域
- 右下角 📍 按钮触发

### 4.4 主题与着色模式

**主题**（可扩展点：CSS 变量 + ECharts theme 对象成对注册）

- 深色科技风（默认）：深色背景、发光边界线
- 浅色清新风：浅色背景、柔和色块
- 新增主题 = 注册一对 `{ cssVars, echartsTheme }`

**着色模式**（可扩展点：`DatasetProvider` 接口）

```
interface DatasetProvider {
  id: string
  name: string
  getData(adcode: string): Record<string, number> | null  // adcode → value
  legend: { label: string; unit?: string }
}
```

- 内置模式：
  1. 默认配色（按区域哈希分配美观调色板颜色）
  2. 彩虹模式（按名称哈希取色）
  3. 单色渐变
  4. 示例数据 choropleth：内置省级示例数据（人口、GDP 静态数据），按数值分档着色 + 图例
- 接入真实业务数据只需实现 `DatasetProvider`

### 4.5 交互细节

- hover：tooltip 显示区域名 + 当前着色数据值
- 选中：边界高亮 + 阴影
- ECharts `roam: true` 支持缩放/平移（含移动端手势）
- 加载中/加载失败状态处理（顶部进度条 + 重试提示）

## 5. 界面设计（悬浮控件式）

全屏地图之上悬浮（z-index 分层）：

```
┌─────────────────────────────────────────────────┐
│ [搜索框__________]   标题        [主题][着色][ℹ] │
│ [面包屑: 全国›浙江›杭州]                          │
│                                                  │
│                  （全屏地图）                     │
│                                                  │
│ [图例]                              [⌂] [📍]    │
└─────────────────────────────────────────────────┘
```

- 顶部左：搜索框（含下拉结果）
- 顶部中：标题（移动端缩小或隐藏）
- 顶部右：主题切换、着色模式选择、说明按钮
- 搜索下方：面包屑
- 右下角：回到全国、定位按钮
- 底部左：图例（着色数据模式时显示）

**响应式**：

- 桌面（≥1024px）：如上完整布局
- 平板（768–1023px）：标题隐藏，控件紧凑化
- 手机（<768px）：控件单列堆叠、搜索框全宽、按钮缩小、图例可折叠

## 6. 项目结构

```
geo-display/
├── public/geo/           # GeoJSON 数据（脚本生成）
├── scripts/
│   └── fetch-geo.mjs     # 数据抓取 + 搜索索引生成
├── src/
│   ├── components/
│   │   ├── MapView.vue       # ECharts 容器与渲染
│   │   ├── SearchBox.vue     # 搜索框 + 下拉
│   │   ├── Breadcrumb.vue    # 面包屑
│   │   ├── LegendPanel.vue   # 图例
│   │   ├── ControlBar.vue    # 主题/着色切换
│   │   └── ActionButtons.vue # 定位/回到全国
│   ├── composables/
│   │   ├── useMap.ts         # ECharts 实例、渲染、事件
│   │   ├── useDrilldown.ts   # 下钻状态机
│   │   ├── useSearch.ts      # 搜索逻辑
│   │   ├── useTheme.ts       # 主题切换
│   │   └── useLocator.ts     # 地理定位 + 点面判断
│   ├── services/
│   │   ├── geoSource.ts      # GeoSource 实现
│   │   ├── searchIndex.ts    # 索引加载与查询
│   │   ├── pinyin.ts         # 拼音/首字母匹配
│   │   └── pointInPolygon.ts # 射线法
│   ├── themes/
│   │   ├── dark.ts
│   │   └── light.ts
│   ├── datasets/
│   │   └── providers.ts      # 内置 DatasetProvider
│   ├── types/
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
└── package.json
```

## 7. 测试

Vitest 单元测试覆盖纯逻辑：

- `pinyin.ts`：拼音/首字母/简称匹配
- `searchIndex.ts`：索引查询
- `pointInPolygon.ts`：射线法（含边界情况：点在边上、多边形外接盒外快速排除）
- `useDrilldown.ts`：下钻状态机
- `datasets/providers.ts`：数据分档

组件与视觉交互手动验证。

## 8. 非目标（YAGNI）

- 不做 IP 定位（外部依赖）
- 不做用户数据上传/编辑
- 不做后端服务
- 不引入大型拼音库（自实现常用字表足够）
- 不做街道/乡镇级（数据源仅到区县级，体量也过大）
