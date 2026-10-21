import type { ThemeDef } from '../types'

export const lightTheme: ThemeDef = {
  id: 'light',
  name: '清新浅色',
  cssVars: {
    '--bg': '#eef3ee',
    '--surface': 'rgba(255, 255, 255, 0.92)',
    '--border': 'rgba(100, 140, 100, 0.3)',
    '--text': '#2c3e50',
    '--text-dim': '#7a8a7a',
    '--accent': '#2e7d32',
    '--hover': 'rgba(46, 125, 50, 0.12)',
    '--shadow': '0 2px 12px rgba(0, 0, 0, 0.12)',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#2c3e50' },
    mapRegion: {
      itemStyle: {
        areaColor: '#dbe9c8',
        borderColor: '#8aa877',
        borderWidth: 1,
      },
      emphasis: {
        label: { color: '#1a2a1a' },
        itemStyle: { areaColor: '#a8d08d', borderColor: '#5a7a4a' },
      },
      select: {
        label: { color: '#1a2a1a' },
        itemStyle: { areaColor: '#f5d98a', borderColor: '#c4a55e' },
      },
    },
  },
}
