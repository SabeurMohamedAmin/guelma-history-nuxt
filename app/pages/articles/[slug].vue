<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const slug = computed(() => String(route.params.slug || ''))

// Fetching, localization and formatting live in the composable, head tags in
// useArticleSeo. This page only decides what goes where.
const { view, breadcrumbs, isLoading, error } = await useArticleDetail(slug)

useArticleSeo({ view, breadcrumbs })
</script>

<template>
  <div class="article-page">
    <!-- Fetch failed: say so instead of rendering an empty page. -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      role="alert"
      rounded="xl"
      :text="t('article.notFound')"
    />

    <!-- Same shape as the real content, so nothing jumps once data lands. -->
    <v-skeleton-loader
      v-else-if="isLoading"
      type="heading, image, paragraph, paragraph"
      class="rounded-xl"
      role="status"
      :aria-label="t('article.loading')"
    />

    <template v-else-if="view">
      <ArticleBreadcrumbs :items="breadcrumbs" />

      <!-- aria-labelledby points at the <h1> rendered by ArticleHeader. -->
      <article aria-labelledby="article-title">
        <ArticleHeader :view="view" />

        <v-row align="start">
          <v-col
            cols="12"
            lg="8"
          >
            <ArticleContent :view="view" />

            <ArticleEngagementPanel
              :slug="view.slug"
              :title="view.title"
              :excerpt="view.excerpt"
              class="mt-6"
            />
          </v-col>

          <!-- Sticky on the column itself: the rail would not stick inside a
               column that is only as tall as its content. -->
          <v-col
            cols="12"
            lg="4"
            class="position-sticky article-page__aside"
          >
            <ArticleAside />
          </v-col>
        </v-row>
      </article>

      <CommentSection
        :article-slug="view.slug"
        class="mt-8"
      />

      <ArticleRelated
        :slug="view.slug"
        :category-slug="view.categorySlug"
        class="my-6"
      />

      <NewsletterForm />
    </template>
  </div>
</template>

<style scoped>
.article-page {
  color: rgb(var(--v-theme-on-background));
}

/* Clears the fixed header when the rail sticks. */
.article-page__aside {
  top: 80px;
}

/* Keyboard users must always see where they are. */
.article-page :deep(a:focus-visible),
.article-page :deep(button:focus-visible),
.article-page :deep(.v-chip:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .article-page :deep(*) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
