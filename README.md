# 中国行政区划地图（geo-display）

纯前端的中国省 / 市 / 区县地理边界地图应用。全屏 ECharts 地图、逐级下钻、
拼音搜索（中文名 / 简称 / 全拼 / 首字母）、浏览器地理定位高亮、深浅双主题、
着色模式（默认 / 彩虹 / 渐变 / 省域面积 choropleth）。响应式适配手机 / 平板 / 桌面，
全部数据本地打包，部署后完全离线可用。

## 快速开始

```bash
npm install
npm run setup      # 从仓库自带 data.zip 解压地图数据（无需联网，秒级）
npm run dev        # 开发
```

`setup` 默认使用仓库打包的 `data.zip`；加 `--download` 重新联网抓取最新数据：

```bash
npm run setup -- --download   # 重新抓取（约 5-10 分钟）
```

## 部署

```bash
npm run build       # 产出 dist/（默认 base=/）
```

把 `dist/` 部署到任意静态服务器即可（数据在 `dist/geo/`）。

### 部署到子路径

应用支持设置 base URL（默认 `.`/根路径）。子路径部署二选一：

```bash
# 方式一：环境变量
BASE_URL=/geo-display/ npm run build

# 方式二：命令行参数
npx vite build --base /geo-display/
```

推送 main 分支会自动通过 GitHub Actions（`.github/workflows/deploy.yml`）
发布到 GitHub Pages 项目页（`https://<user>.github.io/<repo>/`），
workflow 会按仓库名自动设置 base，数据直接使用仓库自带的 `data.zip`
（构建约 1-2 分钟）。首次启用需在仓库
Settings → Pages 中把 Source 设为 `gh-pages` 分支。

## 数据说明

- 仓库自带 `data.zip`（全精度 GeoJSON 打包，约 28 MB），
  `npm run setup` 解压到 `public/geo/` 即可使用
- 数据源：阿里云 DataV GeoAtlas（`geo.datav.aliyun.com`），默认全精度（不简化）
- 重新联网抓取：`npm run setup -- --download`（或直接 `npm run fetch-geo`）
- 数据变更后重新打包提交：`npm run pack-data`（生成/更新 `data.zip`）
- 需要减小体积时可用 `node scripts/fetch-geo.mjs --simplify 15`（边界会失真）
- 台湾省与部分省直辖县级市无下钻数据（源数据限制），界面上点击仅提示

## 技术栈

Vite · Vue 3 · TypeScript · ECharts 5 · Vitest

## 架构

- `src/services/geoSource.ts` — GeoSource 接口（数据源可替换）
- `src/datasets/providers.ts` — DatasetProvider 接口（着色数据可扩展）
- `src/themes/` — 主题对（CSS 变量 + ECharts 主题），新增主题只需注册一组
- `scripts/fetch-geo.mjs` — 数据抓取 / 搜索索引生成（可选 `--simplify` 简化）
- `scripts/pack-data.mjs` — 把 `public/geo/` 打包为 `data.zip`（提交到仓库）
- `scripts/setup-data.mjs` — 数据准备：默认解压 `data.zip`，`--download` 联网重抓
