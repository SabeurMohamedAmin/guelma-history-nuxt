<script setup lang="ts">
/**
 * Companion rail of the article: recent articles, most read, socials.
 * Marked up as <aside> so assistive tech can skip it.
 */
const { t } = useI18n()
</script>

<template>
  <aside :aria-label="t('article.asideLabel')">
    <div class="article-aside glass-surface rounded-xl pa-2">
      <LayoutAppSidebar />
    </div>
  </aside>
</template>

<style scoped>
/* Below "lg" the rail flows under the article, where a panel would read as a
   box inside a box. */
@media (max-width: 1279px) {
  .article-aside {
    padding: 0 !important;
    border: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
