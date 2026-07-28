<script setup lang="ts">
// A single AdSense placement.
//
// Renders nothing when the client id or the slot id is missing, so no broken
// or empty ad boxes appear in development.
withDefaults(defineProps<{
  // Slot id created in the AdSense dashboard ("data-ad-slot").
  adSlot?: string
  format?: 'auto' | 'fluid' | 'horizontal' | 'rectangle' | 'vertical'
  responsive?: boolean
  // Space reserved before the ad arrives, in pixels.
  minHeight?: number
}>(), {
  adSlot: '',
  format: 'auto',
  responsive: true,
  minHeight: 250,
})

const { adsenseClient, requestAd } = useAdsense()

const container = ref<HTMLElement | null>(null)
const requested = ref(false)

// adsbygoogle.js itself is loaded in <head> (see app.vue), because the AdSense
// crawler has to see it. What stays lazy is the ad request: it is sent only
// when the slot gets close to the viewport, and the observer stops itself right
// after, so each slot is requested exactly once.
const { stop } = useIntersectionObserver(
  container,
  ([entry]) => {
    if (!entry?.isIntersecting || requested.value) return

    requested.value = true
    stop()
    requestAd()
  },
  { rootMargin: '200px' },
)
</script>

<template>
  <div
    v-if="adsenseClient && adSlot"
    ref="container"
    class="ad-unit rounded-xl"
    :style="{ minHeight: `${minHeight}px` }"
    aria-hidden="true"
  >
    <ins
      class="adsbygoogle ad-unit__ins"
      :data-ad-client="adsenseClient"
      :data-ad-slot="adSlot"
      :data-ad-format="format"
      :data-full-width-responsive="responsive ? 'true' : 'false'"
    ></ins>
  </div>
</template>

<style scoped>
/* The height is reserved up-front so a late ad never pushes content down. */
.ad-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ad-unit__ins {
  display: block;
  width: 100%;
}
</style>
