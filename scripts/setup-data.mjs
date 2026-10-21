#!/usr/bin/env node
/**
 * 准备地图数据到 public/geo/：
 *  - 默认：从仓库自带的 data.zip 解压（无需联网，秒级完成）
 *  - --download：忽略 data.zip，重新从阿里云 DataV 抓取（运行 scripts/fetch-geo.mjs）
 *
 * 用法: node scripts/setup-data.mjs [--download]
 */
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile, cp } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import ora from 'ora'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const GEO_DIR = path.join(ROOT, 'public', 'geo')
const ZIP_PATH = path.join(ROOT, 'data.zip')

const wantDownload = process.argv.includes('--download')

/** 数据已就绪则跳过（--download 强制重新获取） */
function dataReady() {
  return existsSync(path.join(GEO_DIR, 'manifest.json'))
}

async function unzipTo(targetDir) {
  const zipped = unzipSync(await readFile(ZIP_PATH))
  for (const [rel, bytes] of Object.entries(zipped)) {
    const dest = path.join(targetDir, rel)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, bytes)
  }
}

async function main() {
  if (!wantDownload && dataReady()) {
    ora({ stream: process.stderr }).succeed('数据已就绪（public/geo/），跳过；如需重新下载运行 npm run setup -- --download')
    return
  }

  if (wantDownload) {
    // 重新抓取：委托 scripts/fetch-geo.mjs（保留其完整 ora 日志）
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'fetch-geo.mjs')], { stdio: 'inherit' })
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`fetch-geo 退出码 ${code}`))))
    })
    return
  }

  // 默认：解压 data.zip 到临时目录后原子替换，避免解压失败留下半套数据
  if (!existsSync(ZIP_PATH)) {
    ora({ stream: process.stderr }).fail('缺少 data.zip：运行 npm run pack-data 生成，或 npm run setup -- --download 联网抓取')
    process.exit(1)
  }
  const spinner = ora({ text: '解压 data.zip…', stream: process.stderr }).start()
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'geo-display-'))
  try {
    await unzipTo(tmp)
    await mkdir(path.dirname(GEO_DIR), { recursive: true }) // 新 clone 无 public/ 目录
    await rm(GEO_DIR, { recursive: true, force: true })
    try {
      await rename(tmp, GEO_DIR)
    } catch {
      // 跨盘符无法 rename，退化为复制
      await cp(tmp, GEO_DIR, { recursive: true })
      await rm(tmp, { recursive: true, force: true })
    }
    const count = (await readdir(GEO_DIR)).length
    spinner.succeed(`数据就绪：${count} 个文件已解压到 public/geo/`)
  } catch (e) {
    await rm(tmp, { recursive: true, force: true })
    throw e
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
