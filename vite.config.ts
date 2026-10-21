import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 部署子路径（如 GitHub Pages 项目页 /<repo>/），默认 '/'。
// 可通过环境变量 BASE_URL 覆盖，或构建时 npx vite build --base /repo/
export default defineConfig(({ base } = {}) => ({
  base: base ?? process.env.BASE_URL ?? '/',
  plugins: [vue()],
}))
