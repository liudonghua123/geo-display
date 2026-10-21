#!/usr/bin/env node
/**
 * 抓取阿里云 DataV GeoAtlas 行政区划边界数据，简化后写入 public/geo/。
 * 同时生成搜索索引 search-index.json 与清单 manifest.json。
 *
 * 用法: npm run fetch-geo [-- --keep-full]
 *   --keep-full  跳过 mapshaper 简化（调试用）
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises'
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

/** mapshaper 简化 GeoJSON（Node API，保持拓扑；CLI 的 stdin 方式在 Windows 下不可用） */
let mapshaper
async function simplify(geojson) {
  if (SIMPLIFY_PCT >= 1) return geojson
  if (!mapshaper) mapshaper = (await import('mapshaper')).default
  const output = await mapshaper.applyCommands(
    `-i in.json -simplify ${SIMPLIFY_PCT}% keep-shapes -clean -o format=geojson out.json`,
    { 'in.json': JSON.stringify(geojson) }
  )
  return JSON.parse(output['out.json'])
}

/** 简化后写入 public/geo/{adcode}_full.json —— 所有 GeoJSON 均经此路径 */
async function writeGeo(adcode, geojson) {
  const simplified = await simplify(geojson)
  await writeFile(path.join(OUT_DIR, `${adcode}_full.json`), JSON.stringify(simplified))
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
  await writeGeo(100000, country)

  console.log(`2/3 抓取 ${provinces.length} 个省的市级数据…`)
  const cityTasks = []
  for (const prov of provinces) {
    const p = prov.properties
    index.push(toMeta(prov, 'province', 100000, null)) // 省级一律入索引（即使无下钻数据，如台湾省）
    if (p.childrenNum === 0) { skipped.push(`${p.name}(无下钻)`); continue }
    cityTasks.push((async () => {
      const cities = await fetchJson(`${BASE}/${p.adcode}_full.json`)
      if (!cities) { skipped.push(`${p.name}(_full 404)`); return [] }
      await writeGeo(p.adcode, cities)
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
      await writeGeo(c.adcode, districts)
      for (const d of districts.features.filter((f) => f.properties.name)) {
        index.push(toMeta(d, 'district', c.adcode, c.name))
      }
    }
    done++
    if (done % 10 === 0) console.log(`  ${done}/${provinceCityPairs.length}`)
    await sleep(60)
  }

  // manifest：记录已写入的文件，运行时用于判断数据是否存在
  for (const f of await readdir(OUT_DIR)) manifest.files[f] = true

  await writeFile(path.join(OUT_DIR, 'search-index.json'),
    JSON.stringify(index.sort((a, b) => a.adcode - b.adcode)))
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const geoCount = Object.keys(manifest.files).filter((f) => f.endsWith('_full.json')).length
  console.log(`完成：${geoCount} 个 GeoJSON，${index.length} 条索引`)
  if (skipped.length) console.log(`跳过 ${skipped.length} 项：\n  ` + skipped.join('\n  '))
}

main().catch((e) => { console.error(e); process.exit(1) })
