# 中国行政区划地图（geo-display）

纯前端的中国省 / 市 / 区县地理边界地图应用。全屏 ECharts 地图、逐级下钻、
拼音搜索（中文名 / 简称 / 全拼 / 首字母）、浏览器地理定位高亮、深浅双主题、
着色模式（默认 / 彩虹 / 渐变 / 省域面积 choropleth）。响应式适配手机 / 平板 / 桌面，
全部数据本地打包，部署后完全离线可用。

## 快速开始

```bash
npm install
npm run fetch-geo   # 首次运行：抓取全精度 GeoJSON 数据（约 5-10 分钟）
npm run dev         # 开发
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
workflow 会按仓库名自动设置 base。首次启用需在仓库
Settings → Pages 中把 Source 设为 `gh-pages` 分支。

## 数据说明

- 数据源：阿里云 DataV GeoAtlas（`geo.datav.aliyun.com`），默认全精度（不简化）
- 需要减小体积时可用 `node scripts/fetch-geo.mjs --simplify 15`（边界会失真）
- 更新数据：重跑 `npm run fetch-geo`
- 台湾省与部分省直辖县级市无下钻数据（源数据限制），界面上点击仅提示

## 技术栈

Vite · Vue 3 · TypeScript · ECharts 5 · Vitest

## 架构

- `src/services/geoSource.ts` — GeoSource 接口（数据源可替换）
- `src/datasets/providers.ts` — DatasetProvider 接口（着色数据可扩展）
- `src/themes/` — 主题对（CSS 变量 + ECharts 主题），新增主题只需注册一组
- `scripts/fetch-geo.mjs` — 数据抓取 / 搜索索引生成（可选 `--simplify` 简化）
