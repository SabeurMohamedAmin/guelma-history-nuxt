<script setup lang="ts">
/**
 * Brand logo component.
 * Renders the logo from /public/img/logo/dz_logo.png (converted to WebP
 * by NuxtImg) and links back to the localized homepage.
 *
 * Double-clicking the logo plays a brief scale animation, navigates to the
 * localized home page and smooth-scrolls to the top.
 */
const localePath = useLocalePath()
const { t } = useI18n()
const router = useRouter()

const isPopping = ref(false)

async function handleDoubleClick(event: MouseEvent) {
  // Prevent the default NuxtLink navigation so we can control it ourselves.
  event.preventDefault()

  // Trigger the scale animation.
  isPopping.value = true
  window.setTimeout(() => {
    isPopping.value = false
  }, 300)

  // Navigate home, then smooth-scroll to the top.
  await router.push(localePath('/'))

  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="brand-logo d-inline-flex align-center text-decoration-none"
    :class="{ 'brand-logo--pop': isPopping }"
    :aria-label="t('home.heroTitle')"
    @click="handleDoubleClick"
    @pointerup="handleDoubleClick"
  >
    <!-- NuxtImg converts the PNG to WebP through /_ipx (cached for a year
         by the routeRule) and serves a 2x variant for retina screens. -->
    <NuxtImg
      src="/img/logo/dz_logo.png"
      format="webp"
      alt=""
      class="brand-logo__image"
      width="44"
      height="44"
      densities="x1 x2"
    />
  </NuxtLink>
</template>

<style scoped>
.brand-logo {
  transition: opacity 0.2s ease, transform 0.3s ease;
}

.brand-logo:hover {
  opacity: 0.8;
}

.brand-logo--pop {
  transform: scale(1.16);
}

.brand-logo__image {
  transform: scale(.90);
  display: block;
  width: 44px;
  height: 44px;
  object-fit: contain;
  transition: transform .1s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .brand-logo {
    transition: opacity 0.2s ease;
  }

  .brand-logo--pop {
    transform: none;
  }
}
</style>
