import type { ThemeDef } from '../types'

/** 深色主题：深空蓝 + 青色霓虹辉光 */
export const darkTheme: ThemeDef = {
  id: 'dark',
  name: '深色科技',
  cssVars: {
    '--bg': '#070d1a',
    '--surface': 'rgba(13, 27, 48, 0.72)',
    '--border': 'rgba(0, 200, 255, 0.22)',
    '--text': '#e2f0ff',
    '--text-dim': '#6d8aa8',
    '--accent': '#22d3ee',
    '--hover': 'rgba(34, 211, 238, 0.12)',
    '--shadow': '0 8px 32px rgba(0, 0, 0, 0.55)',
    '--aurora-opacity': '0.45',
  },
  echarts: {
    backgroundColor: 'transparent',
    textStyle: { color: '#e2f0ff' },
    mapRegion: {
      label: {
        color: '#dbeeff',
        // 深色底上描边保证可读性（ECharts 会渲染 textBorder）
        textBorderColor: 'rgba(3, 12, 26, 0.85)',
        textBorderWidth: 2,
      },
      itemStyle: {
        areaColor: 'rgba(30, 64, 110, 0.45)',
        borderColor: 'rgba(34, 211, 238, 0.65)',
        borderWidth: 1,
        shadowColor: 'rgba(34, 211, 238, 0.35)',
        shadowBlur: 10,
      },
      emphasis: {
        label: { color: '#ffffff', fontWeight: 'bold' },
        itemStyle: {
          areaColor: 'rgba(34, 211, 238, 0.45)',
          borderColor: '#7df3ff',
          borderWidth: 1.5,
          // 下沉投影 + 提亮：模拟区域沿 z 轴抬起的悬浮感
          shadowColor: 'rgba(1, 6, 16, 0.75)',
          shadowBlur: 30,
          shadowOffsetY: 16,
        },
      },
      select: {
        label: { color: '#062029' },
        itemStyle: {
          areaColor: '#22d3ee',
          borderColor: '#a5f3fc',
          shadowColor: 'rgba(34, 211, 238, 0.8)',
          shadowBlur: 24,
        },
      },
    },
  },
}
