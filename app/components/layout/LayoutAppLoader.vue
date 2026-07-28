<script setup lang="ts">
/**
 * LayoutAppLoader — presentation-only boot overlay.
 *
 * Controlled via v-model (a boolean): the parent owns the loading state and
 * this component just renders the overlay while it is true. The enter/leave
 * <Transition> lives here, so flipping the model to false fades the loader out
 * gracefully instead of snapping away.
 */
const model = defineModel <boolean> ({ required: true })

const { t } = useI18n()
</script>

<template>
  <Transition
    name="app-loader-fade"
    appear
  >
    <div
      v-if="model"
      class="app-loader"
      role="status"
      aria-live="polite"
      :aria-label="t('common.loading')"
    >
      <div class="app-loader__glow app-loader__glow--primary"></div>
      <div class="app-loader__glow app-loader__glow--accent"></div>

      <div class="app-loader__card">
        <div
          class="app-loader__orbit"
          aria-hidden="true"
        >
          <span class="app-loader__ring app-loader__ring--outer"></span>
          <span class="app-loader__ring app-loader__ring--middle"></span>
          <span class="app-loader__ring app-loader__ring--inner"></span>

          <div class="app-loader__logo-wrap">
            <!-- NuxtImg converts the PNG to WebP through /_ipx (roughly a
                 fifth of the bytes) and serves a 2x variant for retina
                 screens. The /_ipx routeRule caches it for a year. -->
            <NuxtImg
              src="/img/logo/dz_logo.png"
              format="webp"
              alt=""
              class="app-loader__logo"
              width="72"
              height="72"
              densities="x1 x2"
            />
          </div>
        </div>

        <div class="app-loader__content">
          <p class="app-loader__eyebrow">
            Guelma History
          </p>
          <!-- A <p>, not an <h1>: the page's own heading must stay the only h1. -->
          <p class="app-loader__title">
            تاريخ قالمة
          </p>
          <div
            class="app-loader__line"
            aria-hidden="true"
          ></div>
          <p class="app-loader__text">
            {{ t('common.loading') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-loader {
  /* Fallback theme tokens so the loader renders correctly before Vuetify's
     <v-app> mounts and injects the real --v-theme-* variables (cold boot). */
  --loader-primary: var(--v-theme-primary, 21, 101, 192);
  --loader-surface: var(--v-theme-surface, 255, 255, 255);
  --loader-background: var(--v-theme-background, 245, 245, 245);
  --loader-on-surface: var(--v-theme-on-surface, 33, 33, 33);

  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 20%, rgba(var(--loader-primary), 0.18), transparent 30%),
    radial-gradient(circle at 80% 10%, rgba(139, 105, 20, 0.16), transparent 28%),
    linear-gradient(135deg, rgb(var(--loader-surface)) 0%, rgb(var(--loader-background)) 52%, rgba(var(--loader-primary), 0.08) 100%);
}

.app-loader::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image:
    linear-gradient(rgba(var(--loader-primary), 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(var(--loader-primary), 0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle, #000 0%, transparent 72%);
}

.app-loader__glow {
  position: absolute;
  width: 34rem;
  height: 34rem;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.35;
  animation: loader-float 5s ease-in-out infinite alternate;
}

.app-loader__glow--primary {
  top: -12rem;
  inset-inline-start: -10rem;
  background: rgba(var(--loader-primary), 0.28);
}

.app-loader__glow--accent {
  right: -12rem;
  bottom: -14rem;
  background: rgba(139, 105, 20, 0.24);
  animation-delay: -1.5s;
}

.app-loader__card {
  position: relative;
  display: grid;
  gap: 1.5rem;
  justify-items: center;
  width: min(88vw, 390px);
  padding: 2rem 1.75rem;
  text-align: center;
  background: rgba(var(--loader-surface), 0.78);
  border: 1px solid rgba(var(--loader-primary), 0.18);
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(18px);
}

.app-loader__orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
}

.app-loader__ring {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(var(--loader-primary), 0.18);
}

.app-loader__ring--outer {
  inset: 0;
  border-top-color: rgb(var(--loader-primary));
  animation: loader-spin 1.4s linear infinite;
}

.app-loader__ring--middle {
  inset: 12px;
  border-inline-end-color: rgba(139, 105, 20, 0.95);
  animation: loader-spin 2s linear infinite reverse;
}

.app-loader__ring--inner {
  inset: 24px;
  border-bottom-color: rgba(var(--loader-primary), 0.8);
  animation: loader-pulse 1.5s ease-in-out infinite;
}

.app-loader__logo-wrap {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 24px;
  background: rgba(var(--loader-surface), 0.88);
  box-shadow: inset 0 0 0 1px rgba(var(--loader-primary), 0.12), 0 12px 30px rgba(0, 0, 0, 0.12);
}

.app-loader__logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  animation: loader-logo 1.8s ease-in-out infinite;
}

.app-loader__content {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
}

.app-loader__eyebrow {
  margin: 0;
  color: rgb(var(--loader-primary));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.app-loader__title {
  margin: 0;
  font-size: clamp(1.7rem, 8vw, 2.35rem);
  font-weight: 800;
  line-height: 1.1;
}

.app-loader__line {
  position: relative;
  width: 128px;
  height: 3px;
  margin: 0.35rem 0;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--loader-primary), 0.13);
}

.app-loader__line::after {
  position: absolute;
  inset-block: 0;
  inset-inline-start: -45%;
  width: 45%;
  content: '';
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgb(var(--loader-primary)), transparent);
  animation: loader-line 1.15s ease-in-out infinite;
}

.app-loader__text {
  margin: 0;
  color: rgba(var(--loader-on-surface), 0.68);
  font-size: 0.92rem;
}

.app-loader-fade-enter-active,
.app-loader-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.app-loader-fade-enter-from,
.app-loader-fade-leave-to {
  opacity: 0;
  transform: scale(1.01);
}

@keyframes loader-spin {
  to { transform: rotate(360deg); }
}

@keyframes loader-pulse {
  50% {
    opacity: 0.45;
    transform: scale(0.92);
  }
}

@keyframes loader-logo {
  50% { transform: translateY(-3px) scale(1.03); }
}

@keyframes loader-line {
  to { inset-inline-start: 100%; }
}

@keyframes loader-float {
  to { transform: translate3d(1.5rem, -1rem, 0) scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .app-loader__glow,
  .app-loader__ring,
  .app-loader__logo,
  .app-loader__line::after {
    animation: none;
  }
}
</style>
