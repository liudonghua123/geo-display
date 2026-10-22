<template>
  <div ref="rootRef" class="aurora" aria-hidden="true">
    <div class="blob b1" />
    <div class="blob b2" />
    <div class="blob b3" />
    <div class="grain" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 每次加载生成随机基色，三个光斑色相错开，
 * 让整体色相每帧缓慢漂移 —— CPU 上只改 CSS 变量，绘制仍在 GPU。
 */
const rootRef = ref<HTMLElement>()
let raf = 0

onMounted(() => {
  const baseHue = Math.floor(Math.random() * 360)
  // 三个光斑的色相相对基色错开，形成互补/邻近搭配
  const hues = [baseHue, (baseHue + 40 + Math.random() * 80) % 360, (baseHue + 180 + Math.random() * 60) % 360]
  const els = rootRef.value?.querySelectorAll<HTMLElement>('.blob') ?? []
  els.forEach((el, i) => el.style.setProperty('--h', String(Math.round(hues[i] ?? baseHue))))

  // 缓慢的整体色相漂移：每帧推进 0.02deg，一周约 50 分钟，
  // 通过 hue-rotate 滤镜在合成器上完成，不触发重排重绘
  let hue = 0
  const tick = () => {
    hue = (hue + 0.02) % 360
    rootRef.value?.style.setProperty('--hue-rotate', `${hue}deg`)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  opacity: var(--aurora-opacity, 0.5);
  filter: hue-rotate(var(--hue-rotate, 0deg));
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  will-change: transform;
  /* 颜色由脚本注入的 --h（随机基色）驱动 */
  background: radial-gradient(
    circle at 50% 50%,
    hsl(var(--h, 320), 90%, 65%),
    transparent 62%
  );
}
/* 动态背景：GPU 合成层上的 transform 动画，光斑持续移动 */
.b1 {
  width: 55vmax;
  height: 55vmax;
  top: -18vmax;
  left: -12vmax;
  animation: drift1 26s ease-in-out infinite alternate;
}
.b2 {
  width: 48vmax;
  height: 48vmax;
  top: 22%;
  right: -16vmax;
  animation: drift2 32s ease-in-out infinite alternate;
}
.b3 {
  width: 42vmax;
  height: 42vmax;
  bottom: -16vmax;
  left: 24%;
  animation: drift3 38s ease-in-out infinite alternate;
}
@keyframes drift1 {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(9vw, 7vh, 0) scale(1.18); }
}
@keyframes drift2 {
  from { transform: translate3d(0, 0, 0) scale(1.1); }
  to { transform: translate3d(-11vw, -6vh, 0) scale(0.92); }
}
@keyframes drift3 {
  from { transform: translate3d(0, 0, 0) scale(0.95); }
  to { transform: translate3d(6vw, -9vh, 0) scale(1.15); }
}
/* 细腻噪点，弱化渐变色带 */
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}
/* 用户偏好减少动态效果时停用动画 */
@media (prefers-reduced-motion: reduce) {
  .blob { animation: none; }
}
</style>
