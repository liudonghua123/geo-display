import { ref, watchEffect } from 'vue'

/** 是否显示地图区域标签（默认显示），偏好持久化到 localStorage */
const saved = localStorage.getItem('gd-labels')
export const showLabels = ref(saved !== '0')

watchEffect(() => {
  localStorage.setItem('gd-labels', showLabels.value ? '1' : '0')
})
