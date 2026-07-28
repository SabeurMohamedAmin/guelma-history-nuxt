import { ref, computed, onMounted, onUnmounted } from 'vue'

// ─── Configuration ─────────────────────────────────────────
export const CONFIG = {
  scrollThreshold: 100,
  ringRadius: 23,
  ringStrokeWidth: 3,
  scrollBehavior: 'smooth' as ScrollBehavior,
} as const

// ─── SVG Geometry Constants ────────────────────────────────
export const RING_RADIUS = CONFIG.ringRadius
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// ─── Composable ────────────────────────────────────────────
export function useBackToTop(threshold: number = CONFIG.scrollThreshold) {
  const visible = ref(false)
  const progress = ref(0)

  const dashOffset = computed(
    () => RING_CIRCUMFERENCE * (1 - progress.value),
  )

  function updateScrollProgress(): void {
    const scrollTop = window.scrollY
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight

    progress.value = maxScroll > 0
      ? Math.min(scrollTop / maxScroll, 1)
      : 0

    visible.value = scrollTop > threshold
  }

  function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: CONFIG.scrollBehavior })
  }

  onMounted(() => {
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    updateScrollProgress() // Check initial scroll position on mount
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScrollProgress)
  })

  return {
    visible,
    progress,
    dashOffset,
    scrollToTop,
    RING_RADIUS,
    RING_CIRCUMFERENCE,
    CONFIG,
  }
}
