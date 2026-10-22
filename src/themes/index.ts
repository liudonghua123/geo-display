import type { ThemeDef } from '../types'
import { lightTheme } from './light'
import { darkTheme } from './dark'

// 浅色在前：getTheme 兜底返回第一项，保证默认主题为 light
export const THEMES: ThemeDef[] = [lightTheme, darkTheme]

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
