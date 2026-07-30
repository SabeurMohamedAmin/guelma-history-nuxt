<script setup lang="ts">
defineProps<{
  imageUrl: string
  alt: string
}>()
</script>

<template>
  <figure class="article-cover ma-0 rounded-xl">
    <!-- This is the article page's LCP element. `preload` emits a
         <link rel="preload"> in the head and fetchpriority="high" moves the
         fetch ahead of CSS/JS instead of leaving it queued (Lighthouse
         measured a 5s "resource load delay" without them). -->
    <NuxtImg
      :src="imageUrl"
      :alt="alt"
      class="article-cover-image"
      sizes="xs:100vw sm:100vw md:900px lg:640px"
      format="webp"
      loading="eager"
      fetchpriority="high"
      preload
    />
    <div
      class="article-cover-glow rounded-circle"
      aria-hidden="true"
    ></div>
  </figure>
</template>

<style scoped>
.article-cover {
  position: relative;
  min-height: clamp(280px, 42vw, 560px);
  overflow: hidden;
  isolation: isolate;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.15);
}

.article-cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  transform: scale(1.01);
}

.article-cover::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(to top, rgba(0, 0, 0, 0.42), transparent 52%);
  pointer-events: none;
}

.article-cover-glow {
  position: absolute;
  inset-inline: 12%;
  bottom: -18%;
  height: 28%;
  background: rgba(var(--v-theme-primary), 0.36);
  filter: blur(44px);
  z-index: -1;
}
</style>
