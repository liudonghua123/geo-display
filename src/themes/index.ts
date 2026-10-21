import type { ThemeDef } from '../types'
import { darkTheme } from './dark'
import { lightTheme } from './light'

export const THEMES: ThemeDef[] = [darkTheme, lightTheme]

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
