import type { ThemeDef } from '../types'

export const darkTheme: ThemeDef = {
  id: 'dark',
  name: '深色科技',
  cssVars: {
    '--bg': '#0b1626',
    '--surface': 'rgba(16, 34, 56, 0.88)',
    '--border': 'rgba(0, 200, 255, 0.25)',
    '--text': '#d8ecff',
    '--text-dim': '#7fa3c0',
    '--accent': '#00c8ff',
    '--hover': 'rgba(0, 200, 255, 0.15)',
    '--shadow': '0 4px 20px rgba(0, 0, 0, 0.5)',
    '--aurora-opacity': '0.3',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#d8ecff' },
    mapRegion: {
      itemStyle: {
        areaColor: 'rgba(40, 120, 200, 0.22)',
        borderColor: 'rgba(0, 200, 255, 0.9)',
        borderWidth: 1.2,
        shadowColor: 'rgba(0, 200, 255, 0.4)',
        shadowBlur: 8,
      },
      emphasis: {
        label: { color: '#ffffff' },
        itemStyle: {
          areaColor: 'rgba(0, 200, 255, 0.45)',
          borderColor: '#ffffff',
          shadowBlur: 16,
        },
      },
      select: {
        label: { color: '#ffffff' },
        itemStyle: { areaColor: 'rgba(0, 220, 180, 0.55)', borderColor: '#ffffff' },
      },
    },
  },
}
