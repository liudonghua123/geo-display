import type { ThemeDef } from '../types'

/** 苹果风格浅色主题：磨砂玻璃面板 + 绚丽极光渐变背景 */
export const lightTheme: ThemeDef = {
  id: 'light',
  name: '苹果浅色',
  cssVars: {
    '--bg': '#f5f6f8',
    '--surface': 'rgba(255, 255, 255, 0.72)',
    '--border': 'rgba(0, 0, 0, 0.08)',
    '--text': '#1d1d1f',
    '--text-dim': '#86868b',
    '--accent': '#0071e3',
    '--hover': 'rgba(0, 113, 227, 0.10)',
    '--shadow': '0 8px 32px rgba(0, 0, 0, 0.12)',
    '--aurora-opacity': '0.55',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#1d1d1f' },
    mapRegion: {
      label: { color: '#42506b' },
      itemStyle: {
        areaColor: '#e2e8f2',
        borderColor: '#ffffff',
        borderWidth: 1,
      },
      emphasis: {
        label: { color: '#1d1d1f' },
        itemStyle: {
          areaColor: '#bfe0ff',
          borderColor: '#0071e3',
          shadowBlur: 12,
          shadowColor: 'rgba(0, 113, 227, 0.35)',
        },
      },
      select: {
        label: { color: '#1d1d1f' },
        itemStyle: { areaColor: '#ffd60a', borderColor: '#e6a700' },
      },
    },
  },
}
