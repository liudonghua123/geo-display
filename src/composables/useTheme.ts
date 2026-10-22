import { ref, watchEffect } from 'vue'
import type { ThemeDef } from '../types'
import { getTheme } from '../themes'

const saved = localStorage.getItem('gd-theme')
const themeId = ref(saved ?? 'light')

watchEffect(() => {
  const theme: ThemeDef = getTheme(themeId.value)
  for (const [k, v] of Object.entries(theme.cssVars)) {
    document.documentElement.style.setProperty(k, v)
  }
  // 原生控件滚动条/表单配色跟随主题
  document.documentElement.style.colorScheme = theme.id === 'dark' ? 'dark' : 'light'
  localStorage.setItem('gd-theme', themeId.value)
})

export function useTheme() {
  function setTheme(id: string) {
    themeId.value = id
  }
  return { themeId, setTheme }
}
