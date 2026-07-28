<script setup lang="ts">
import { useTheme } from 'vuetify'
import { computed } from 'vue'

const {
  visible,
  dashOffset,
  scrollToTop,
  RING_RADIUS,
  RING_CIRCUMFERENCE,
  CONFIG,
} = useBackToTop()

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)
</script>

<template>
  <v-fade-transition>
    <div
      v-if="visible"
      class="back-to-top-container position-fixed bottom-0 end-0 ma-7 d-flex align-center justify-center"
      style="z-index: 1000; width: 52px; height: 52px;"
    >
      <!-- Progress Ring -->
      <svg
        class="progress-ring"
        viewBox="0 0 52 52"
        aria-hidden="true"
      >
        <circle
          class="progress-ring__track"
          cx="26"
          cy="26"
          :r="RING_RADIUS"
          fill="none"
          :stroke-width="CONFIG.ringStrokeWidth"
        />
        <circle
          class="progress-ring__arc"
          cx="26"
          cy="26"
          :r="RING_RADIUS"
          fill="none"
          :stroke-width="CONFIG.ringStrokeWidth"
          :stroke-dasharray="RING_CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
        />
      </svg>

      <!-- Action Button -->
      <v-btn
        icon="mdi-chevron-up"
        variant="flat"
        width="46"
        height="46"
        class="glass-btn"
        :class="isDark ? 'glass-btn--dark' : 'glass-btn--light'"
        aria-label="Back to top"
        @click="scrollToTop"
      />
    </div>
  </v-fade-transition>
</template>

<style scoped>
/* ─── Progress ring ──────────────────────────────────────── */
.progress-ring {
  position      : absolute;
  inset         : 0;
  width         : 100%;
  height        : 100%;
  transform     : rotate(-90deg);
  pointer-events: none;
}

.progress-ring__track {
  stroke: rgba(var(--v-theme-on-surface), 0.12);
}

.progress-ring__arc {
  stroke    : rgb(233, 187, 7);
  transition: stroke-dashoffset 60ms linear;
}

/* ─── Glass base (shared) ────────────────────────────────── */
.glass-btn {
  backdrop-filter        : blur(12px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
  transition             : transform 100ms ease-out, box-shadow 100ms ease-out !important;
}

/* ─── Light ──────────────────────────────────────────────── */
.glass-btn--light {
  background : rgba(255, 255, 255, 0.50) !important;
  border     : 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow : 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  color      : rgba(0, 0, 0, 0.70) !important;
}

.glass-btn--light:hover {
  background : rgba(255, 255, 255, 0.65) !important;
  box-shadow : 0 4px 12px rgba(0, 0, 0, 0.10) !important;
}

/* ─── Dark ───────────────────────────────────────────────── */
.glass-btn--dark {
  background : rgba(255, 255, 255, 0.08) !important;
  border     : 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow : 0 2px 8px rgba(0, 0, 0, 0.20) !important;
  color      : rgba(255, 255, 255, 0.85) !important;
}

.glass-btn--dark:hover {
  background : rgba(255, 255, 255, 0.12) !important;
  box-shadow : 0 4px 12px rgba(0, 0, 0, 0.25) !important;
}
</style>
