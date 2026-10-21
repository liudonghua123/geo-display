#!/usr/bin/env node
/**
 * 打包 public/geo/ 下所有数据文件为项目根目录的 data.zip（提交到 git 仓库），
 * 使 clone 后无需联网抓取即可直接使用（配合 scripts/setup-data.mjs 解压）。
 *
 * 用法: npm run pack-data
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'
import ora from 'ora'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const GEO_DIR = path.join(ROOT, 'public', 'geo')
const ZIP_PATH = path.join(ROOT, 'data.zip')

/** 递归收集目录下所有文件的相对路径 */
async function collect(dir, base = dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await collect(full, base, acc)
    else acc.push(path.relative(base, full).replaceAll('\\', '/'))
  }
  return acc
}

const spinner = ora({ text: '扫描数据文件…', stream: process.stderr }).start()
const files = await collect(GEO_DIR)
if (files.length === 0) {
  spinner.fail('public/geo/ 为空：请先运行 npm run setup -- --download 抓取数据')
  process.exit(1)
}

spinner.text = `压缩 ${files.length} 个文件…`
const zipped = {}
for (const rel of files) {
  zipped[rel] = await readFile(path.join(GEO_DIR, rel))
}
const data = zipSync(zipped, { level: 6 })
await writeFile(ZIP_PATH, data)

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB'
spinner.succeed(`打包 ${files.length} 个文件 → data.zip（${mb(data.length)}，原始 ${mb(files.reduce((s, f) => s + zipped[f].length, 0))}）`)
